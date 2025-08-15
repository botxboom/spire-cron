const { setLastRun, getLastRun } = require("./lastRunStore");
require("dotenv").config();

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
class SpireHubSpotAPI {
  #spireBaseUrl = process.env.SPIRE_BASE_URL;
  #spireHubspotObjectMapping = {
    customers: "companies",
    contacts: "contacts",
    products: "products",
    deals: "deals",
  };

  constructor() {
    this.companies = [];
    this.contacts = [];
    this.products = [];
    this.deals = [];
    this.limit = 1000;
  }

  #createCompanyObject(spireData) {
    return {
      properties: {
        spireid: spireData.id,
        name: spireData.name,
      },
    };
  }

  #getSpireObjectById = async (id, company, object) => {
    const apiPath = `${
      this.#spireBaseUrl
    }/companies/${company}/${object}/${id}`;

    const response = await fetch(apiPath, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Basic a2pvbDpLam9sMTIzKg==`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const jsonData = await response.json();
    return jsonData;
  };

  #searchObjectByKey = async (key, value, object) => {
    const apiPath = `${process.env.HUBSPOT_API_URL}/${
      this.#spireHubspotObjectMapping[object]
    }/search`;

    const response = await fetch(apiPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              {
                propertyName: key,
                operator: "EQ",
                value,
              },
            ],
          },
        ],
      }),
    });

    if (response.status !== 200) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const jsonData = await response.json();
    return new Promise((resolve) => {
      if (jsonData.results.length > 0) {
        resolve(jsonData.results[0].id);
      } else {
        resolve(null);
      }
    });
  };

  #createHubSpotObject = async (item, object) => {
    const apiPath = `${process.env.HUBSPOT_API_URL}/${
      this.#spireHubspotObjectMapping[object]
    }`;
    const response = await fetch(apiPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(item),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const jsonData = await response.json();
    if (jsonData.id) {
      console.log(
        `${this.#spireHubspotObjectMapping[object]} created in HubSpot:`,
        jsonData.id
      );
    }
    return jsonData;
  };

  #getDealById2 = async (id, company) => {
    const apiPath = `${
      this.#spireBaseUrl
    }companies/${company}/sales/invoices/${id}`;
    const response = await fetch(apiPath, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Basic ${process.env.SPIRE_ACCESS_TOKEN}`,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const jsonData = await response.json();
    return jsonData;
  };

  // #getDealById = async (id, company) => {
  //   const apiPath = `${
  //     this.#spireBaseUrl
  //   }companies/${company}/sales/orders/${id}`;
  //   const response = await fetch(apiPath, {
  //     method: "GET",
  //     headers: {
  //       accept: "application/json",
  //       authorization: `Basic ${process.env.SPIRE_ACCESS_TOKEN}`,
  //     },
  //   });
  //   if (!response.ok) {
  //     throw new Error(`HTTP error! status: ${response.status}`);
  //   }
  //   const jsonData = await response.json();
  //   return jsonData;
  // };

  #updateObjectByKey = async (key, item, object) => {
    const apiPath = `${process.env.HUBSPOT_API_URL}/${
      this.#spireHubspotObjectMapping[object]
    }/${key}`;
    const response = await fetch(apiPath, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(item),
    }).catch((error) => {
      console.error("Error in updateObjectByKey:", error);
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const jsonData = await response.json();
    if (jsonData.id) {
      console.log(
        `${this.#spireHubspotObjectMapping[object]} updated in HubSpot:`,
        jsonData.id
      );
    }
    return jsonData;
  };

  async associateContactToCompany(contactId, companyId) {
    const apiPath = `https://api.hubapi.com/crm/v4/objects/companies/${companyId}/associations/default/contact/${contactId}`;
    const response = await fetch(apiPath, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    console.log(`Contact ${contactId} associated to company ${companyId}`);
  }

  async getDealByOrderNo(orderNo, company) {
    const apiPath = `${
      this.#spireBaseUrl
    }/companies/${company}/sales/orders/?filter={"orderNo":"${orderNo}"}`;
    const response = await fetch(apiPath, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Basic ${process.env.SPIRE_ACCESS_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  async getDealLineItemsByOrderNo2(orderNo, company) {
    const filter = { id: orderNo };
    const apiPath = `${
      this.#spireBaseUrl
    }/companies/${company}/sales/invoice_items?filter=${JSON.stringify(
      filter
    )}`;
    const response = await fetch(apiPath, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Basic ${process.env.SPIRE_ACCESS_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  // async getDealLineItemsByOrderNo(orderNo, company) {
  //   const apiPath = `${
  //     this.#spireBaseUrl
  //   }/companies/${company}/sales/orders/${orderNo}/items`;
  //   const response = await fetch(apiPath, {
  //     method: "GET",
  //     headers: {
  //       accept: "application/json",
  //       authorization: `Basic ${process.env.SPIRE_ACCESS_TOKEN}`,
  //     },
  //   });

  //   if (!response.ok) {
  //     throw new Error(`HTTP error! status: ${response.status}`);
  //   }
  //   return await response.json();
  // }

  async postLineItemsToHubspot(lineItem, dealId) {
    const searchApiPath = `${process.env.HUBSPOT_API_URL}/line_items/search`;
    const searchResponse = await fetch(searchApiPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              {
                propertyName: "name",
                operator: "EQ",
                value: lineItem.properties.name,
              },
              {
                propertyName: "associations.deal",
                operator: "EQ",
                value: dealId,
              },
            ],
          },
        ],
        properties: ["name", "price", "quantity"],
        associations: ["deal"],
        limit: 10,
      }),
    });

    if (!searchResponse.ok) {
      throw new Error(`HTTP error! status: ${searchResponse.status}`);
    }
    const searchData = await searchResponse.json();
    if (searchData.results.length > 0) {
      return searchData.results[0];
    }

    // If line item does not exist, create it

    const apiPath = `${process.env.HUBSPOT_API_URL}/line_items`;
    const response = await fetch(apiPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(lineItem),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const jsonData = await response.json();
    if (jsonData.id) {
      console.log(
        `Line item created in HubSpot: ${jsonData.id} for deal 39908866489`
      );
    }
    return jsonData;
  }

  async associateCompanyToDeals(companyId, dealId) {
    const apiPath = `https://api.hubapi.com/crm/v4/objects/deals/${dealId}/associations/default/companies/${companyId}`;
    const response = await fetch(apiPath, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    console.log(`Company ${companyId} associated to deal ${dealId}`);
  }

  async #fetchData(apiPath) {
    const response = await fetch(apiPath, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Basic ${process.env.SPIRE_ACCESS_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  async getCustomersByCompany(company, lastRun = getLastRun("customers")) {
    const filter = encodeURIComponent(
      JSON.stringify({ created: { $gt: lastRun } })
    );
    const apiPath = `${
      this.#spireBaseUrl
    }/companies/${company}/customers?limit=${this.limit}&filter=${filter}`;
    const jsonData = await this.#fetchData(apiPath);
    if (jsonData.records.length) {
      console.log("total records:", jsonData.records.length);
      const latest = jsonData.records.reduce((a, b) => {
        return new Date(a.created) > new Date(b.created) ? a : b;
      });
      setLastRun("customers", latest.created);
    }

    this.companies = jsonData.records.map(this.#createCompanyObject);
    return this.companies;
  }

  async getContactsByCompany(company, lastRun = getLastRun("contacts")) {
    const filter = encodeURIComponent(
      JSON.stringify({ created: { $gt: lastRun } })
    );
    const apiPath = `${
      this.#spireBaseUrl
    }/companies/${company}/contacts?limit=${this.limit}&filter=${filter}`;
    const jsonData = await this.#fetchData(apiPath);
    if (jsonData.records.length) {
      console.log("total records:", jsonData.records.length);
      const latest = jsonData.records.reduce((a, b) => {
        return new Date(a.created) > new Date(b.created) ? a : b;
      });
      setLastRun("contacts", latest.created);
    }

    this.contacts = jsonData.records
      .filter((c) => c.name || c.email)
      .map((contact) => ({
        properties: {
          spireid: contact.id,
          email: contact.email,
          phone: contact.phone,
          companyIdToLink: contact.address.id,
        },
      }));

    return this.contacts;
  }

  async getProductsByCompany(company, lastRun = getLastRun("products")) {
    const filter = encodeURIComponent(
      JSON.stringify({ created: { $gt: lastRun } })
    );
    const purchasingApiPath = `${
      this.#spireBaseUrl
    }/companies/${company}/purchasing/items?limit=${this.limit}`;

    const salesApiPath = `${
      this.#spireBaseUrl
    }/companies/${company}/sales/items?limit=${this.limit}&filter=${filter}`;

    const salesData = await this.#fetchData(salesApiPath);
    if (salesData.records.length) {
      console.log("total records:", salesData.records.length);
      const latest = salesData.records.reduce((a, b) => {
        return new Date(a.created) > new Date(b.created) ? a : b;
      });
      setLastRun("products", latest.created);
    }

    const purchaseData = await this.#fetchData(purchasingApiPath);

    const productsData = [...purchaseData.records, ...salesData.records];
    this.products = productsData
      .filter((p) => p.partNo)
      .map((product) => ({
        properties: {
          spireid: product.id,
          name: product.partNo,
          description: product.description,
          price: product.unitPrice,
        },
      }));

    return this.products;
  }

  async getDealsByCustomer(customerId) {
    const filter = encodeURIComponent(
      JSON.stringify({ "customer.id": customerId })
    );

    const salesOrdersApi = `${
      this.#spireBaseUrl
    }/companies/Bethel/sales/invoices?limit=${this.limit}&filter=${filter}`;

    const salesData = await this.#fetchData(salesOrdersApi);

    if (salesData.records.length) {
      const latest = salesData.records.reduce((a, b) => {
        return new Date(a.created) > new Date(b.created) ? a : b;
      });
      setLastRun("deals", latest.created);
    }

    this.deals = [...salesData.records]
      .filter((d) => d.total > 0)
      .map((deal) => ({
        properties: {
          spireid: deal.id,
          dealname: deal.number ?? deal.orderNo,
          pipeline: "default",
          dealstage: "contractsent",
          amount: deal.total,
          customerId: deal?.customer?.id,
        },
      }));

    return this.deals;
  }

  async getDealsByCompany(company, lastRun = getLastRun("deals")) {
    const filter = encodeURIComponent(
      JSON.stringify({ created: { $gt: lastRun } })
    );

    const salesOrdersApi = `${
      this.#spireBaseUrl
    }/companies/${company}/sales/invoices?limit=${this.limit}&filter=${filter}`;

    const salesData = await this.#fetchData(salesOrdersApi);

    if (salesData.records.length) {
      console.log("total records:", salesData.records.length);
      const latest = salesData.records.reduce((a, b) => {
        return new Date(a.created) > new Date(b.created) ? a : b;
      });
      setLastRun("deals", latest.created);
    }

    this.deals = [...salesData.records]
      .filter((d) => d.total > 0)
      .map((deal) => ({
        properties: {
          spireid: deal.id,
          dealname: deal.number ?? deal.orderNo,
          pipeline: "default",
          dealstage: "contractsent",
          amount: deal.total,
          customerId: deal?.customer?.id,
        },
      }));

    return this.deals;
  }

  async #createOrUpdateHubSpotObject(item, object) {
    const spireid = item.properties.spireid;
    const id = await this.#searchObjectByKey("spireid", spireid, object);

    if (id) {
      return await this.#updateObjectByKey(id, item, object);
    } else {
      return await this.#createHubSpotObject(item, object);
    }
  }

  async postCompaniesToHubspot() {
    if (this.companies.length === 0) return;

    for (const company of this.companies) {
      await delay(300); // 300ms delay between calls
      await this.#createOrUpdateHubSpotObject(company, "customers");
    }
  }

  async postContactsToHubspot() {
    if (this.contacts.length === 0) return;

    for (const contact of this.contacts) {
      const companySpireId = contact.properties.companyIdToLink;
      delete contact.properties.companyIdToLink;

      const con = await this.#createOrUpdateHubSpotObject(contact, "contacts");

      if (con && companySpireId) {
        await delay(300); // Add a small delay to avoid hitting rate limits
        const companyId = await this.#searchObjectByKey(
          "spireid",
          companySpireId,
          "customers"
        );
        if (companyId) {
          await this.associateContactToCompany(con.id, companyId);
        }
      }
    }
  }

  async associateContactToDeals(contactId, dealId) {
    const apiPath = `https://api.hubapi.com/crm/v4/objects/deals/${dealId}/associations/default/contact/${contactId}`;
    const response = await fetch(apiPath, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    console.log(`Contact ${contactId} associated to deal ${dealId}`);
    return response;
  }

  async postProductsToHubspot() {
    if (this.products.length === 0) return;

    for (const product of this.products) {
      await delay(300); // 300ms delay between calls
      await this.#createOrUpdateHubSpotObject(product, "products");
    }
  }

  async postDealContactsAndAssociate(deal, contact) {
    console.log(contact);
    if (JSON.stringify(contact) !== "{}" && contact?.properties?.email) {
      // Add a small delay to avoid hitting rate limits
      await delay(300);
      const contactId = await this.#searchObjectByKey(
        "email",
        contact.properties.spireid,
        "contacts"
      );
      if (contactId) {
        await this.#updateObjectByKey(contactId, contact, "contacts");
        await this.associateContactToDeals(contactId, deal.id);
      } else {
        const newCont = await this.#createOrUpdateHubSpotObject(
          contact,
          "contacts"
        );
        await this.associateContactToDeals(newCont.id, deal.id);
      }
    }
  }

  async getOrderContactsByOrderId(customerSpireId) {
    const apiPath = `${
      this.#spireBaseUrl
    }/companies/Bethel/customers/${customerSpireId}`;

    const response = await fetch(apiPath, {
      method: "GET",
      headers: {
        Authorization: "Basic a2pvbDpLam9sMTIzKg==",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch customer: ${response.statusText}`);
    }
    const data = await response.json();

    const contacts = data.address.contacts;
    const contactsToSend = [];
    const uniqueEmails = [];
    if (contacts.length > 0) {
      for (const contact of contacts) {
        if (uniqueEmails.includes(contact.email)) {
          continue;
        } else {
          uniqueEmails.push(contact.email);
          const cont = {
            properties: {
              spireid: contact.email,
              firstname: contact.name.split(" ")[0],
              lastname: contact.name.split(" ")[1],
              email: contact.email,
              phone: contact.phone.number,
            },
          };

          contactsToSend.push(cont);
        }
      }
    }

    return contactsToSend;
  }

  async postDealsToHubspot() {
    if (this.deals.length === 0) return;

    // Process deals sequentially to avoid 429 throttling
    for (const deal of this.deals) {
      const customerSpireId = deal.properties.customerId;
      delete deal.properties.customerId;

      const newDeal = await this.#createOrUpdateHubSpotObject(deal, "deals");

      if (newDeal && customerSpireId) {
        // Add a small delay to avoid hitting rate limits
        await new Promise((resolve) => setTimeout(resolve, 250));
        await delay(300);
        const companyId = await this.#searchObjectByKey(
          "spireid",
          customerSpireId,
          "customers"
        );
        if (companyId) {
          await this.associateCompanyToDeals(companyId, newDeal.id);
        } else {
          const spireCompany = await this.#getSpireObjectById(
            customerSpireId,
            "Bethel",
            "customers"
          );
          const company = this.#createCompanyObject(spireCompany);
          const newCompany = await this.#createOrUpdateHubSpotObject(
            company,
            "customers"
          );
          await this.associateCompanyToDeals(newCompany.id, newDeal.id);
        }

        const order = await this.#getDealById2(
          deal.properties.spireid,
          "Bethel"
        );

        if (order) {
          const orderContacts = await this.getOrderContactsByOrderId(
            customerSpireId
          );
          for (const contact of orderContacts) {
            await this.postDealContactsAndAssociate(newDeal, contact);
          }

          const lineItems = await this.getDealLineItemsByOrderNo2(
            order.id,
            "Bethel"
          );
          if (lineItems.records.length > 0) {
            for (const item of lineItems.records) {
              const lineItem = {
                properties: {
                  price: item.unitPrice,
                  quantity: item.orderQty,
                  name: item.inventory.partNo,
                  description: item.description,
                },
                associations: [
                  {
                    to: {
                      id: newDeal.id,
                    },
                    types: [
                      {
                        associationCategory: "HUBSPOT_DEFINED",
                        associationTypeId: 20,
                      },
                    ],
                  },
                ],
              };
              if (lineItem.properties.name && newDeal.id) {
                await this.postLineItemsToHubspot(lineItem, newDeal.id);
              }
            }
          }
        }
      }
    }
  }
}

module.exports = SpireHubSpotAPI;

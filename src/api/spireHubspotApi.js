const { setLastRun } = require("../utils/lastRunStore");

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

  async getCustomersByCompany(company, limit = 100, lastRun = null) {
    const filter = encodeURIComponent(
      JSON.stringify({ created: { $gt: lastRun } })
    );
    const apiPath = `${
      this.#spireBaseUrl
    }/companies/${company}/customers?limit=${limit}&filter=${filter}`;
    const jsonData = await this.#fetchData(apiPath);
    if (jsonData.records.length) {
      const latest = jsonData.records.reduce((a, b) => {
        return new Date(a.created) > new Date(b.created) ? a : b;
      });
      setLastRun("customers", latest.created);
    }

    this.companies = jsonData.records.map(this.#createCompanyObject);
    return this.companies;
  }

  async getContactsByCompany(company, limit = 100, lastRun = null) {
    const filter = encodeURIComponent(
      JSON.stringify({ created: { $gt: lastRun } })
    );
    const apiPath = `${
      this.#spireBaseUrl
    }/companies/${company}/contacts?limit=${limit}&filter=${filter}`;
    const jsonData = await this.#fetchData(apiPath);
    if (jsonData.records.length) {
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
          compnayIdToLink: contact.address.id,
        },
      }));

    return this.contacts;
  }

  async getProductsByCompany(company, limit = 100, lastRun = null) {
    const filter = encodeURIComponent(
      JSON.stringify({ created: { $gt: lastRun } })
    );
    const purchasingApiPath = `${
      this.#spireBaseUrl
    }/companies/${company}/purchasing/items?limit=${limit}`;

    const salesApiPath = `${
      this.#spireBaseUrl
    }/companies/${company}/sales/items?limit=${limit}&filter=${filter}`;

    const salesData = await this.#fetchData(salesApiPath);
    if (salesData.records.length) {
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

  async getDealsByCompany(company, limit = 100, lastRun = null) {
    const filter = encodeURIComponent(
      JSON.stringify({ created: { $gt: lastRun } })
    );
    const purchasingOrdersApi = `${
      this.#spireBaseUrl
    }/companies/${company}/purchasing/orders?limit=${limit}&filter=${filter}`;
    const salesOrdersApi = `${
      this.#spireBaseUrl
    }/companies/${company}/sales/orders?limit=${limit}&filter=${filter}`;

    const purchasingData = await this.#fetchData(purchasingOrdersApi);
    const salesData = await this.#fetchData(salesOrdersApi);

    if (salesData.records.length) {
      const latest = salesData.records.reduce((a, b) => {
        return new Date(a.created) > new Date(b.created) ? a : b;
      });
      setLastRun("deals", latest.created);
    }

    this.deals = [...purchasingData.records, ...salesData.records]
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
    await delay(250); // Add a small delay to avoid hitting rate limits
    const id = await this.#searchObjectByKey("spireid", spireid, object);

    if (id) {
      return await this.#updateObjectByKey(id, item, object);
    } else {
      return await this.#createHubSpotObject(item, object);
    }
  }

  async postCompaniesToHubspot() {
    if (this.companies.length === 0) return;

    await Promise.all(
      this.companies.map(
        async (company) =>
          await this.#createOrUpdateHubSpotObject(company, "customers")
      )
    );
  }

  async postContactsToHubspot() {
    if (this.contacts.length === 0) return;

    await Promise.all(
      this.contacts.map(async (contact) => {
        const companySpireId = contact.properties.compnayIdToLink;
        delete contact.properties.compnayIdToLink;

        const con = await this.#createOrUpdateHubSpotObject(
          contact,
          "contacts"
        );

        if (con && companySpireId) {
          await delay(250); // Add a small delay to avoid hitting rate limits
          const companyId = await this.#searchObjectByKey(
            "spireid",
            companySpireId,
            "customers"
          );
          if (companyId) {
            await this.associateContactToCompany(con.id, companyId);
          }
        }
      })
    );
  }

  async postProductsToHubspot() {
    if (this.products.length === 0) return;

    await Promise.all(
      this.products.map(
        async (product) =>
          await this.#createOrUpdateHubSpotObject(product, "products")
      )
    );
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
        await delay(250);
        const companyId = await this.#searchObjectByKey(
          "spireid",
          customerSpireId,
          "customers"
        );
        if (companyId) {
          await this.associateCompanyToDeals(companyId, newDeal.id);
        }
      }
    }
  }
}

module.exports = SpireHubSpotAPI;

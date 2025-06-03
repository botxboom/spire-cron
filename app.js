require("dotenv").config();
const https = require("https");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const agent = new https.Agent({
  rejectUnauthorized: false,
});

let latestOrderCreatedTime = null;
let latestCompaniesCreated = null;

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

  #createCompanyObject = (spireData) => {
    return {
      properties: {
        spireid: spireData.id,
        name: spireData.name,
      },
    };
  };

  async getCustomersByCompany(company, limit = 100) {
    const apiPath = `${
      this.#spireBaseUrl
    }/companies/${company}/customers?limit=${limit}`;
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
    if (jsonData.records.length > 0) {
      this.companies = jsonData.records.map((company) => {
        return this.#createCompanyObject(company);
      });

      if (this.companies.length > 0) {
        latestCompaniesCreated = this.companies[0]?.created || null;
      }
    } else {
      latestCompaniesCreated = null;
    }

    return this.companies;
  }

  async getContactsByCompany(company, limit = 100) {
    const apiPath = `${
      this.#spireBaseUrl
    }/companies/${company}/contacts?limit=${limit}`;
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
    if (jsonData.records.length > 0) {
      this.contacts = jsonData.records
        .filter((c) => c.name || c.email)
        .map((contact) => {
          return {
            properties: {
              spireid: contact.id,
              email: contact.email,
              phone: contact.phone,
              compnayIdToLink: contact.address.id,
              // other properties
            },
          };
        });

      if (this.contacts.length > 0) {
        latestOrderCreatedTime = this.contacts[0]?.created || null;
      }
    } else {
      latestOrderCreatedTime = null;
    }

    return this.contacts;
  }

  async getProductsByCompany(company, limit = 100) {
    const apiPath = `${
      this.#spireBaseUrl
    }/companies/${company}/purchasing/items?limit=${limit}`;
    const purchasingResponse = await fetch(apiPath, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Basic ${process.env.SPIRE_ACCESS_TOKEN}`,
      },
    });

    const salesResponse = await fetch(
      `${this.#spireBaseUrl}/companies/${company}/sales/items?limit=${limit}`,
      {
        method: "GET",
        headers: {
          accept: "application/json",
          authorization: `Basic ${process.env.SPIRE_ACCESS_TOKEN}`,
        },
      }
    );

    if (!purchasingResponse.ok) {
      throw new Error(`HTTP error! status: ${purchasingResponse.status}`);
    }

    if (!salesResponse.ok) {
      throw new Error(`HTTP error! status: ${salesResponse.status}`);
    }

    const purchaseData = await purchasingResponse.json();
    const salesData = await salesResponse.json();

    const productsData = purchaseData.records.concat(salesData.records);
    if (productsData.length > 0) {
      this.products = productsData
        .filter((p) => p.partNo)
        .map((product) => {
          return {
            properties: {
              spireid: product.id,
              name: product.partNo,
              description: product.description,
              price: product.unitPrice,
            },
          };
        });

      if (this.products.length > 0) {
        latestCountOfItems = this.products[0]?.created || null;
      }
    } else {
      latestCountOfItems = null;
    }

    return this.products;
  }

  async getDealsByCompany(company, limit = 100) {
    const purchasingOrdersApi = `${
      this.#spireBaseUrl
    }/companies/${company}/purchasing/orders?limit=${limit}`;
    const salesOrdersApi = `${
      this.#spireBaseUrl
    }/companies/${company}/sales/orders?limit=${limit}`;

    const purchasingResponse = await fetch(purchasingOrdersApi, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Basic ${process.env.SPIRE_ACCESS_TOKEN}`,
      },
    });

    const salesResponse = await fetch(salesOrdersApi, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Basic ${process.env.SPIRE_ACCESS_TOKEN}`,
      },
    });

    if (!purchasingResponse.ok) {
      throw new Error(`HTTP error! status: ${purchasingResponse.status}`);
    }

    if (!salesResponse.ok) {
      throw new Error(`HTTP error! status: ${salesResponse.status}`);
    }

    const purchasingData = await purchasingResponse.json();
    const salesData = await salesResponse.json();

    const dealsData = (purchasingData.records || []).concat(
      salesData.records || []
    );

    this.deals = dealsData
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

  async postCompaniesToHubspot() {
    if (this.companies.length === 0) {
      return;
    }

    await Promise.all(
      this.companies.map(async (company) => {
        const spireid = company.properties.spireid;
        if (spireid) {
          const id = await this.#searchObjectByKey(
            "spireid",
            spireid,
            "customers"
          );
          if (id) {
            await this.#updateObjectByKey(id, company, "customers");
          } else {
            await this.#createHubSpotObject(company, "customers");
          }
        }
      })
    );
  }

  async postContactsToHubspot() {
    if (this.contacts.length === 0) {
      return;
    }

    await Promise.all(
      this.contacts.map(async (contact) => {
        const spireid = contact.properties.spireid;
        const companySpireId = contact.properties.compnayIdToLink;
        delete contact.properties.compnayIdToLink;
        if (spireid) {
          const id = await this.#searchObjectByKey(
            "spireid",
            spireid,
            "contacts"
          );
          let con = null;
          if (id) {
            con = await this.#updateObjectByKey(id, contact, "contacts");
          } else {
            con = await this.#createHubSpotObject(contact, "contacts");
          }

          if (con && companySpireId) {
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
      })
    );
  }

  async postProductsToHubspot() {
    if (this.products.length === 0) {
      return;
    }

    for (const product of this.products) {
      const spireid = product.properties.spireid;
      if (spireid) {
        const id = await this.#searchObjectByKey(
          "spireid",
          spireid,
          "products"
        );
        if (id) {
          await this.#updateObjectByKey(id, product, "products");
        } else {
          await this.#createHubSpotObject(product, "products");
        }
      }
    }
  }

  async postDealsToHubspot() {
    if (this.deals.length === 0) {
      return;
    }

    for (const deal of this.deals) {
      const spireid = deal.properties.spireid;
      const customerSpireId = deal.properties.customerId;
      delete deal.properties.customerId;
      if (spireid) {
        const id = await this.#searchObjectByKey("spireid", spireid, "deals");

        let newDeal = "null";
        if (id) {
          newDeal = await this.#updateObjectByKey(id, deal, "deals");
        } else {
          newDeal = await this.#createHubSpotObject(deal, "deals");
        }

        if (newDeal && customerSpireId) {
          const companyId = await this.#searchObjectByKey(
            "spireid",
            customerSpireId,
            "customers"
          );

          if (companyId) {
            await this.associateCompanyToDeals(companyId, newDeal.id);
          } else {
            const company = await this.#searchObjectByKey(
              "spireid",
              customerSpireId,
              "customers"
            );

            if (company) {
              let companyIdToAssociate = company.id;
              if (companyIdToAssociate) {
                await this.associateCompanyToDeals(
                  companyIdToAssociate.id,
                  newDeal.id
                );
              }
            } else {
              const spireCustomer = await this.#getSpireObjectById(
                customerSpireId,
                "Bethel",
                "customers"
              );
              const newCompanyObject = this.#createCompanyObject(spireCustomer);
              const newCompany = await this.#createHubSpotObject(
                newCompanyObject,
                "customers"
              );
              let companyIdToAssociate = newCompany.id;
              if (companyIdToAssociate) {
                await this.associateCompanyToDeals(
                  companyIdToAssociate.id,
                  newDeal.id
                );
              }
            }
          }
        }
      }
    }
  }
}

async function fetchAndPostData() {
  const spireHubspotAPI = new SpireHubSpotAPI();
  // await spireHubspotAPI.getCustomersByCompany("Bethel", 5); // hubspot companies
  // await spireHubspotAPI.getContactsByCompany("Bethel", 5); // hubspot contacts
  // await spireHubspotAPI.getProductsByCompany("Bethel", 5);
  await spireHubspotAPI.getDealsByCompany("Bethel", 5);
  // await spireHubspotAPI.postCompaniesToHubspot();
  // await spireHubspotAPI.postContactsToHubspot();
  // await spireHubspotAPI.postProductsToHubspot();
  await spireHubspotAPI.postDealsToHubspot();
}

(async () => {
  console.log("Application started. Running initial fetch and post process...");
  await fetchAndPostData();
})();

// https://192.168.0.35:10880/api/v2/companies/Bethel/customers -> Companies
// https://192.168.0.35:10880/api/v2/companies/Bethel/contacts -> Contacts

// TODO
// https://192.168.0.35:10880/api/v2/companies/Bethel/purchasing/items -> Products
// https://192.168.0.35:10880/api/v2/companies/Bethel/sales/items -> Products
// https://192.168.0.35:10880/api/v2/companies/Bethel/purchasing/orders -> Deals
// https://192.168.0.35:10880/api/v2/companies/Bethel/sales/orders -> Deals

// "id": 1,
// "customerNo": " A SIMPLE",
// "name": "A SI",

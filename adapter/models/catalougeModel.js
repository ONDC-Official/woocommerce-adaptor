/**
 * Maps WooCommerce products to ONDC catalog 
 * @param {Array} products - Array of WooCommerce product objects
 * @returns {Object} - ONDC formatted catalog
 */
const mapToONDC = (products) => {
  return {
    "bpp/descriptor": {
      name: "WooCommerce Store",
      short_desc: "ONDC-enabled WooCommerce Store",
      symbol: "https://example.com/logo.png",
      images: ["https://example.com/storefront.jpg"]
    },
    "bpp/providers": [
      {
        id: "WooCommerce_Store",
        descriptor: {
          name: "WooCommerce Store",
          short_desc: "WooCommerce Retail Store"
        },
        categories: extractCategories(products),
        items: products.map(product => ({
          id: product.id.toString(),
          descriptor: {
            name: product.name,
            short_desc: product.short_description?.replace(/<\/?[^>]+(>|$)/g, "") || "",
            long_desc: product.description?.replace(/<\/?[^>]+(>|$)/g, "") || "",
            images: product.images.map(img => ({
              url: img.src
            }))
          },
          price: {
            currency: "INR",
            value: product.price || product.regular_price || "0",
            maximum_value: product.regular_price || product.price || "0",
          },
          category_id: product.categories[0]?.id.toString() || "",
          fulfillment_id: "standard-delivery",
          location_id: "store-location",
          "@ondc/org/returnable": true,
          "@ondc/org/cancellable": true,
          "@ondc/org/available_on_cod": true,
          "@ondc/org/time_to_ship": "P1D",
          "@ondc/org/seller_pickup_return": false,
          "@ondc/org/return_window": "P7D",
          "@ondc/org/contact_details_consumer_care": "support@example.com",
          "tags": [
            {
              "code": "type",
              "list": [
                {
                  "code": "type",
                  "value": product.type
                }
              ]
            },
            {
              "code": "attributes",
              "list": product.attributes.map(attr => ({
                "code": attr.name,
                "value": attr.options.join(", ")
              }))
            }
          ]
        })),
        fulfillments: [
          {
            id: "standard-delivery",
            type: "Delivery",
            tracking: false,
            provider_name: "WooCommerce Store Delivery",
            rating: "4.5",
            contact: {
              phone: "+910000000000",
              email: "delivery@example.com"
            }
          }
        ],
        locations: [
          {
            id: "store-location",
            gps: "12.9716,77.5946",
            address: {
              street: "MG Road",
              city: "Bangalore",
              area_code: "560001",
              state: "Karnataka",
              country: "India"
            },
            circle: {
              gps: "12.9716,77.5946",
              radius: {
                unit: "km",
                value: "10"
              }
            },
            time: {
              days: "1,2,3,4,5,6,7",
              schedule: {
                holidays: ["2023-08-15"],
                frequency: "PT24H",
                times: ["0000", "2359"]
              }
            }
          }
        ]
      }
    ],
    "bpp/fulfillments": [
      {
        id: "standard-delivery",
        type: "Delivery"
      }
    ],
    "exp": new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Catalog valid for 24 hours
  };
};

// Rest of the extractCategories function remains the same

/**
 * Extract unique categories from products
 * @param {Array} products - Array of products
 * @returns {Array} - Unique categories
 */
const extractCategories = (products) => {
  const categoryMap = {};
  
  products.forEach(product => {
    product.categories.forEach(category => {
      if (!categoryMap[category.id]) {
        categoryMap[category.id] = {
          id: category.id.toString(),
          descriptor: {
            name: category.name
          }
        };
      }
    });
  });
  
  return Object.values(categoryMap);
};

module.exports = {
  mapToONDC,
};
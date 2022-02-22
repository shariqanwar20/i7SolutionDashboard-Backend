import AWS = require("aws-sdk");
const axios = require("axios");
const dynamodb = new AWS.DynamoDB.DocumentClient({ apiVersion: "2012-08-10" });
const uuid = require("uuid");
import { Product as ProductType } from "../../entities/Product";
const _Product = require("/opt/Product");
const Product = _Product.Product as typeof ProductType;

exports.handler = async (event: any) => {
  try {
    const body = JSON.stringify({
      marketplace: "ca",
    });

    const tokenConfig = {
      method: "post",
      url: "https://api.cloud.im/marketplace/na/token",
      headers: {
        "X-Subscription-Key": "32a94b0a9cf74f99bd4f673f7fb32aaf",
        Authorization: "Basic b21pZEBpN3MuY2EuYXBpOjB2V1ZZcEYtT0B6dQ==",
        "Content-Type": "application/json",
      },
      data: body,
    };
    const { data } = await axios(tokenConfig);

    let offset = 0;
    let limit = 25;
    var productsConfig = {
      method: "get",
      url: `https://api.cloud.im/marketplace/na/products?offset=${offset}&limit=${limit}`,
      headers: {
        "X-Subscription-Key": "32a94b0a9cf74f99bd4f673f7fb32aaf",
        Authorization: `Bearer ${data.token}`,
      },
    };
    let total = 9999999;
    
    // const existingProducts = await getProductIdsFromDynamoDB("IngramCloud");

    // if (existingProducts) {
    //   while (offset < existingProducts.length) {
    //     offset += limit;
    //     await deleteProductsFromDynamoDB(
    //       existingProducts?.slice(offset, offset + limit - 1)
    //     );
    //   }
    // }
    while (offset < total) {
      let products = await axios(productsConfig);
      total = products.data.pagination.total;
      offset += limit;
      console.log(products.data.data);
      await addProductsToDynamoDB(products.data.data);
    }
  } catch (error) {
    const err: any = error;
    console.log("Error From Loading Products => ", err);

    let errorMessage = "Could not add Product";

    if (err.code === "ConditionalCheckFailedException") {
      errorMessage = "Product already exists.";
    }

    throw new Error(errorMessage);
  }
};

async function addProductsToDynamoDB(products: any) {
  console.log("Length of profucts => ", products.length);

  var params = {
    RequestItems: {
      i7SolutionsTable: [] as any[],
    },
  };
  products.forEach((productDetails: any) => {
    let productParams = {
      id: productDetails.mpn,
      uniqueId: uuid.v4(),
      name: productDetails.name,
      description: "",
      vendorId: "IngramCloud",
      msrp: productDetails.prices[0].amount,
      cost: productDetails.costs[0].amount,
      images: [],
      inventoryQuantity: productDetails.maximumQuantity,
      createdAt: new Date().toISOString(),
      storesPublished: [],
    };
    const product = new Product(productParams);
    params.RequestItems.i7SolutionsTable.push({
      PutRequest: {
        Item: product.toItem(),
      },
    });
  });

  // batch write operation
  try {
    const result = await dynamodb.batchWrite(params).promise();
    console.log("Result from loadINgramCloudProducts Put => ", result);
  } catch (error) {
    console.log("Erro => ", error);
  }
}

// async function deleteProductsFromDynamoDB(products: any) {
//   var params = {
//     RequestItems: {
//       i7SolutionsTable: [] as any[],
//     },
//   };
//   products.forEach((productDetails: any) => {
//     const productId = {
//       PK: productDetails.PK,
//       SK: productDetails.SK,
//     };
//     params.RequestItems.i7SolutionsTable.push({
//       DeleteRequest: {
//         Key: productId,
//       },
//     });
//   });

//   // batch write operation
//   try {
//     const result = await dynamodb.batchWrite(params).promise();
//     console.log("Result from loadINgramCloudProducts Delete => ", result);
//   } catch (error) {
//     console.log("Error => ", error);
//   }
// }

// async function getProductIdsFromDynamoDB(vendorId: string) {
//   const params = {
//     TableName: process.env.TABLE_NAME!,
//     ScanIndexForward: true,
//     FilterExpression: "begins_with(#PK, :PK)",
//     ExpressionAttributeNames: {
//       "#PK": "PK",
//     },
//     ExpressionAttributeValues: {
//       ":PK": `VENDOR#${vendorId}`,
//     },
//   };
//   try {
//     const result = await dynamodb.scan(params).promise();
//     return result.Items;
//   } catch (error) {
//     console.log("Error => ", error);
//     throw new Error(error as string);
//   }
// }

// function uniqBy(products: any) {
//   let seen = new Set();
//   let uniqueProducts = [];
//   return products.filter((item: any) => {
//     let k = item.mpn;
//     if (!seen.has(k)) {
//       seen.add(k);
//       return uniqueProducts.push(item);
//     }
//     return false;
//   });
// }

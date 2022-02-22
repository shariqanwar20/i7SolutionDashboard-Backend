import AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient({ apiVersion: "2012-08-10" });
// import { Product as ProductType } from "../../entities/Product";
const _Product = require("/opt/Product");
const productFromItem = _Product.productFromItem;

exports.handler = async () => {
  const params = {
    TableName: process.env.TABLE_NAME!,
    ScanIndexForward: false,
    KeyConditionExpression: "begins_with(#PK, :PK) and begins_with(#SK, :SK)",
    ExpressionAttributeNames: {
      "#PK": "PK",
      "#SK": "SK",
    },
    ExpressionAttributeValues: {
      ":PK": `VENDOR`,
      ":SK": `PRODUCT`,
    },
  };
    try {
      const result = await dynamodb.query(params).promise();
      const products = result.Items?.map((item) => (productFromItem(item)))
      console.log("Products => ", products);
      return products;
    } catch (error) {
      console.log("Error => ", error);
      const err: any = error;
      console.log("Error From Fetching Products => ", err);
  
      let errorMessage = "Could not fetch Products";
  
      if (err.code === "ConditionalCheckFailedException") {
        errorMessage = "Products Condition checking error";
      }
  
      throw new Error(errorMessage);
    }
};

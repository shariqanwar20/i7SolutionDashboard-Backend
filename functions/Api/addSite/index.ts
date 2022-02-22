import AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient({ apiVersion: "2012-08-10" });
import { Site as SiteType } from "../../entities/Site";
const _Site = require("/opt/Site");
const Site = _Site.Site as typeof SiteType;
import { SiteInput } from "../../../types/graphql";
const uuid = require("uuid");

type AppSyncEvent = {
  info: {
    fieldName: string;
  };
  arguments: {
    input: SiteInput;
  };
};

exports.handler = async (event: AppSyncEvent) => {
  const siteParams = {
    id: uuid.v4(),
    name: event.arguments.input.name,
    owner: event.arguments.input.owner,
    url: event.arguments.input.url,
  };
  const site = new Site(siteParams);
  console.log("Site => ", site);

  const userParams = {
    Item: site.toItem(),
    TableName: process.env.TABLE_NAME!,
    ConditionExpression:
      "attribute_not_exists(PK) and attribute_not_exists(SK)",
  };
  try {
    await dynamodb.put(userParams).promise();

    return siteParams;
  } catch (error) {
    const err: any = error;
    console.log("Error From Adding Site => ", err);

    let errorMessage = "Could not add Site";

    if (err.code === "ConditionalCheckFailedException") {
      errorMessage = "Site with this username has already registered.";
    }

    throw new Error(errorMessage);
  }
};

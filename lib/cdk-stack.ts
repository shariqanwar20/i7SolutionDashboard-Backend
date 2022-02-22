import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as appsync from "@aws-cdk/aws-appsync-alpha";

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /* Appsync lambda DynamoDB for Order Details + apis to send the order to relevant vendor */
    const storeTable = new dynamodb.Table(this, "i7SolutionsTable", {
      tableName: "i7SolutionsTable",
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userPool = new cognito.UserPool(this, "i7SolutionsUserPool", {
      selfSignUpEnabled: true,
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      userVerification: {
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        phoneNumber: {
          required: false,
          mutable: true,
        },
        fullname: {
          required: false, //later change to true in production
          mutable: true
        }
      }
    });

    const userPoolClient = new cognito.UserPoolClient(
      this,
      "i7SolutionsUserPoolClient",
      {
        userPool,
      }
    );

    const dashboardApi = new appsync.GraphqlApi(this, "DashboardApi", {
      name: "DashboardApi",
      schema: appsync.Schema.fromAsset("graphql/schema.graphql"),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: { userPool },
        },
        additionalAuthorizationModes: [
          {
            authorizationType: appsync.AuthorizationType.API_KEY,
            apiKeyConfig: {
              expires: cdk.Expiration.after(cdk.Duration.days(30)),
            },
          },
        ],
      },
    });

    // storeTable.addGlobalSecondaryIndex({
    //   indexName: "GSIUpdateProduct",
    //   partitionKey: { name: "productId", type: dynamodb.AttributeType.STRING },
    // });

    const lambdaLayer = new lambda.LayerVersion(this, "LambdaLayer", {
      code: lambda.Code.fromAsset("functions/entities"),
    });
    const apiDependencies = new lambda.LayerVersion(this, "ApiDependencies", {
      code: lambda.Code.fromAsset("lambdaLayer"),
    });

    const addSiteLambda = new lambda.Function(this, "addSiteLambda", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("functions/Api/addSite"),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(10),
      layers: [lambdaLayer, apiDependencies]
    });
    storeTable.grantFullAccess(addSiteLambda);
    addSiteLambda.addEnvironment("TABLE_NAME", storeTable.tableName);
    const addSiteLambdaDataSource = dashboardApi.addLambdaDataSource("addSiteLambdaDataSource", addSiteLambda);
    addSiteLambdaDataSource.createResolver({
      typeName: "Mutation",
      fieldName: "addSite",
    });

    const loadIngramCloudProducts = new lambda.Function(this, "loadIngramCloudProducts", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("functions/Cloudwatch/loadIngramCloudProducts"),
      handler: "index.handler",
      timeout: cdk.Duration.minutes(5),
      layers: [lambdaLayer, apiDependencies],
    });
    storeTable.grantFullAccess(loadIngramCloudProducts);
    loadIngramCloudProducts.addEnvironment("TABLE_NAME", storeTable.tableName);

    // const ScheduleLoadIngramCloudProducts = new events.Rule(this, "ScheduleLoadIngramCloudProducts", {
    //   targets: [new targets.LambdaFunction(loadIngramCloudProducts)],
    //   enabled: true,
    //   schedule: events.Schedule.rate(cdk.Duration.minutes(5)),
    // })


    const createUserLambda = new lambda.Function(this, "createUserLambda", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("functions/Api/createUser"),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(10),
      layers: [lambdaLayer]
    });
    storeTable.grantFullAccess(createUserLambda);
    createUserLambda.addEnvironment("TABLE_NAME", storeTable.tableName);
    userPool.addTrigger(cognito.UserPoolOperation.PRE_SIGN_UP, createUserLambda);

    const getProductsLambda = new lambda.Function(this, "getProductsLambda", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("functions/Api/getProducts"),
      handler: "index.handler",
      timeout: cdk.Duration.minutes(5),
      layers: [lambdaLayer, apiDependencies]
    });
    storeTable.grantFullAccess(getProductsLambda);
    getProductsLambda.addEnvironment("TABLE_NAME", storeTable.tableName);
    const getProductsLambdaDataSource = dashboardApi.addLambdaDataSource("getProductsLambdaDataSource", getProductsLambda);
    getProductsLambdaDataSource.createResolver({
      typeName: "Query",
      fieldName: "getProducts",
    });

    const shopifyEventBus = events.EventBus.fromEventBusArn(
      this,
      "ShopifyEventBus",
      "arn:aws:events:us-west-2:790305819936:event-bus/aws.partner/shopify.com/6414351/shop-event-bus"
    );

    const targetFunction = new lambda.Function(this, "TargetShopifyFunction", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("functions"),
      handler: "main.handler",
    });

    const OrderRule = new events.Rule(this, "OrderRule", {
      targets: [new targets.LambdaFunction(targetFunction)],
      eventBus: shopifyEventBus,
      eventPattern: {
        detailType: ["shopifyWebhook"],
        detail: {
          metadata: {
            "X-Shopify-Topic": [
              {
                prefix: "orders",
              },
            ],
          },
        },
      },
    });
  }
}

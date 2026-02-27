import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam'; // Added IAM imports

export class VelocisCdkInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. Create the DynamoDB Table
    const repoTable = new dynamodb.Table(this, 'VelocisRepositoryState', {
      partitionKey: { name: 'RepoID', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'CommitHash', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 2. Create the Webhook Handler Lambda (Now pointing to the 'lambda' folder)
    const webhookLambda = new lambda.Function(this, 'WebhookHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda'), // Swapped inline code for the folder
      timeout: cdk.Duration.seconds(30), // Claude needs more than the default 3 seconds!
    });

    // Grant DynamoDB access
    repoTable.grantReadWriteData(webhookLambda);

    // GRANT BEDROCK ACCESS (The Sentinel Permission Slip)
    // GRANT BEDROCK & MARKETPLACE ACCESS (The Sentinel Permission Slip)
    webhookLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'bedrock:InvokeModel',
        'aws-marketplace:ViewSubscriptions',
        'aws-marketplace:Subscribe'
      ],
      resources: ['*'],
    }));5 

    // 3. Create the API Gateway
    const api = new apigateway.RestApi(this, 'VelocisGithubAPI', {
      restApiName: 'Velocis Webhook Service',
    });

    const webhookIntegration = new apigateway.LambdaIntegration(webhookLambda);
    const webhookResource = api.root.addResource('webhook');
    webhookResource.addMethod('POST', webhookIntegration);
  }
}
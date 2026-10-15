import json
import os

import boto3
from boto3.dynamodb.conditions import Key

table = boto3.resource("dynamodb").Table(os.environ["TABLE_NAME"])


def response(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json; charset=utf-8"},
        "body": json.dumps(body, ensure_ascii=False),
    }


def lambda_handler(event, context):
    article_id = event["pathParameters"]["articleId"]

    result = table.query(
        KeyConditionExpression=Key("articleId").eq(article_id),
        ScanIndexForward=False,  # 新しい順
        Limit=100,
    )

    comments = [
        {"name": i["name"], "body": i["body"], "createdAt": i["createdAt"]}
        for i in result["Items"]
    ]
    return response(200, comments)
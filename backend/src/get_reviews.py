import json
import os
from decimal import Decimal

import boto3

table = boto3.resource("dynamodb").Table(os.environ["TABLE_NAME"])


def _default(obj):
    # DynamoDBの数値はDecimalで返ってくるので、JSONにできる形に変換する
    if isinstance(obj, Decimal):
        return int(obj) if obj == obj.to_integral_value() else float(obj)
    raise TypeError


def lambda_handler(event, context):
    items = table.scan().get("Items", [])
    # 新しい順に並べる
    items.sort(key=lambda x: x.get("createdAt", ""), reverse=True)

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(items, default=_default, ensure_ascii=False),
    }

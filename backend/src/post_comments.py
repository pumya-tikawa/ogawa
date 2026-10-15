import json
import os
import re
from datetime import datetime, timezone

import boto3

table = boto3.resource("dynamodb").Table(os.environ["TABLE_NAME"])

ARTICLE_ID_PATTERN = re.compile(r"^[a-z0-9-]{1,64}$")
MAX_NAME = 30
MAX_BODY = 500


def response(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json; charset=utf-8"},
        "body": json.dumps(body, ensure_ascii=False),
    }


def lambda_handler(event, context):
    article_id = event["pathParameters"]["articleId"]
    if not ARTICLE_ID_PATTERN.match(article_id):
        return response(400, {"message": "記事IDが不正です"})

    try:
        data = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return response(400, {"message": "JSONの形式が不正です"})

    name = str(data.get("name", "")).strip()
    body = str(data.get("body", "")).strip()

    if not name or len(name) > MAX_NAME:
        return response(400, {"message": f"名前は1〜{MAX_NAME}文字で入力してください"})
    if not body or len(body) > MAX_BODY:
        return response(400, {"message": f"コメントは1〜{MAX_BODY}文字で入力してください"})

    item = {
        "articleId": article_id,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "name": name,
        "body": body,
    }
    table.put_item(Item=item)
    return response(201, item)
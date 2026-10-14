import json
import os
import uuid
from datetime import datetime, timezone

import boto3

table = boto3.resource("dynamodb").Table(os.environ["TABLE_NAME"])


def _response(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, ensure_ascii=False),
    }


def lambda_handler(event, context):
    # リクエストのJSONを読む
    try:
        data = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _response(400, {"message": "JSONの形式が正しくありません"})

    title = str(data.get("title", "")).strip()
    comment = str(data.get("comment", "")).strip()
    rating = data.get("rating")

    # 入力チェック
    if not title or len(title) > 100:
        return _response(400, {"message": "titleは1〜100文字で入力してください"})
    if not isinstance(rating, int) or isinstance(rating, bool) or not 1 <= rating <= 5:
        return _response(400, {"message": "ratingは1〜5の整数で入力してください"})
    if len(comment) > 500:
        return _response(400, {"message": "commentは500文字以内で入力してください"})

    item = {
        "id": str(uuid.uuid4()),
        "title": title,
        "rating": rating,
        "comment": comment,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    table.put_item(Item=item)

    return _response(201, item)

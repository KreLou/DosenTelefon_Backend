import json


def topics(event, context):
    topics = ["Corona"]
    return {
        'statusCode': 200,
        'body': json.dumps(topics)
    }

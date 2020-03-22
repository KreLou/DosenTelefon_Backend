import json
import csv

def read_csv(returnKey, corona):
    deck_yes = {}
    deck_no = {}
    keys = []
    
    with open('deck.csv') as csv_file:
        csv_reader = csv.reader(csv_file, delimiter=';')
        
        for row in csv_reader:
            questions = []
            key = row[0]
            corona_csv = row[1]
            if row[0] not in keys:
                keys.append(row[0])
            
            for i in range(2,len(row)):
                if row[i] != "" and row[i] != " ": 
                    questions.append(row[i])
                else: 
                    break
                
            if corona_csv == 'yes': 
                deck_yes[key] = questions
            else: 
                deck_no[key] = questions

    if corona == 'yes' and returnKey in deck_yes:
        return deck_yes[returnKey]
    elif returnKey in deck_no:
        return deck_no[returnKey]
    else: 
        return "Problem"
        

def lambda_handler(event, context):
    deck = read_csv(event["pathParameters"]["nameDeck"], event["queryStringParameters"]["corona"])
    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': 'true',
        },
        'body': json.dumps(deck)
    }

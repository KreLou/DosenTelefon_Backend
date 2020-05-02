import json
import csv

def read_csv():
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

    return keys


def lambda_handler(event, context):
    keys = read_csv()
    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': 'true',
        },
        'body': json.dumps(keys)
    }

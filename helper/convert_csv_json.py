import csv
import json
from pathlib import Path

csv_file = Path("C:/Users/annve/Documents/VSC Workspace/Projects/Callander Cemetery IOS/data/callander_graves.csv")
json_file = Path("C:/Users/annve/Documents/VSC Workspace/Projects/Callander Cemetery IOS/data/names.json")

columns_to_keep = ['Section', 'Number', 'First_Name', 'Surname', 'Age', 'Age_Unit', 'Date_Died', 'Date_Buried', 'OBJECTID']

with open(csv_file, mode='r', newline='', encoding='utf-8') as csvfile:
    reader = csv.DictReader(csvfile)

    data = [
        {column: row[column] for column in columns_to_keep}
        for row in reader
    ]

with open(json_file, mode='w', encoding='utf-8') as jsonfile:
    json.dump(data, jsonfile, indent=4)


print('Done')
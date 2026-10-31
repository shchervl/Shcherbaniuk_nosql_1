import os

import pandas as pd
from dotenv import load_dotenv
from pymongo import MongoClient

CSV_PATH = "data/dataset.csv"
COLLECTION = "tracks_raw"

load_dotenv()
db = MongoClient(os.environ["MONGODB_URI"]).get_default_database()

# TODO: прочитати CSV_PATH через pandas і завантажити записи в db[COLLECTION]

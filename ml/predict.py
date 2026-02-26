import sys
import joblib

model = joblib.load("../model/phishing_model.pkl")
vectorizer = joblib.load("../model/vectorizer.pkl")

text = sys.argv[1]

text_tfidf = vectorizer.transform([text])
prediction = model.predict(text_tfidf)[0]
probability = model.predict_proba(text_tfidf)[0][1]

print(f"{prediction},{probability}")
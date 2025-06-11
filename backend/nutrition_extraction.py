from transformers import pipeline
import re

def extract_nutrition(text: str) -> dict:
    # Use a simple regex-based fallback for now
    def get(label, default=0):
        match = re.search(rf'{label}[:\s]*([\d\.]+)', text, re.IGNORECASE)
        return float(match.group(1)) if match else default
    def get_ingredients():
        match = re.search(r'ingredients[:\s]*([A-Za-z0-9,\-\s]+)', text, re.IGNORECASE)
        return [i.strip() for i in match.group(1).split(',')] if match else []
    def get_serving_size():
        match = re.search(r'serving size[:\s]*([\w\s\d\(\)\/\.]+)', text, re.IGNORECASE)
        return match.group(1).strip() if match else ''

    # Optionally, use a transformers pipeline for NER (can be improved with a custom model)
    # nlp = pipeline('ner', grouped_entities=True)
    # entities = nlp(text)
    # ... (custom logic to extract nutrition from entities)

    return {
        'calories': get('calories'),
        'protein': get('protein'),
        'carbs': get('carb'),
        'fat': get('fat'),
        'fiber': get('fiber'),
        'sugar': get('sugar'),
        'sodium': get('sodium'),
        'ingredients': get_ingredients(),
        'serving_size': get_serving_size(),
    } 
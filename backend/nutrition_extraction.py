from transformers import pipeline
import re
from typing import Dict, List, Union, Optional

def normalize_unit(value: str) -> float:
    """Convert various unit formats to standard values"""
    if value is None:
        return 0.0
    value = value.lower().strip()
    # Remove any non-numeric characters except decimal point
    numeric = re.sub(r'[^\d.]', '', value)
    if not numeric:
        return 0.0
    
    # Convert to float
    result = float(numeric)
    
    # Handle different units
    if 'mg' in value:
        if 'g' in value:  # e.g., "1.5g (1500mg)"
            return result
        return result / 1000  # Convert mg to g
    elif 'mcg' in value or 'μg' in value:
        return result / 1000000  # Convert mcg to g
    elif 'kg' in value:
        return result * 1000  # Convert kg to g
    return result

def extract_nutrition(text: str) -> Dict[str, Union[float, str, List[str]]]:
    # Preprocess OCR text for common errors and normalize whitespace
    text = text.replace("Distary Eben ber", "Dietary Fiber")
    text = re.sub(r'\s+', ' ', text)  # Collapse whitespace

    # Define nutrient patterns (add more as needed)
    nutrient_patterns = {
        'calories': r'calories?\s*([0-9]+)',
        'fat': r'(?:total )?fat[^\d]*([0-9.]+)\s*g',
        'saturated_fat': r'saturated fat[^\d]*([0-9.]+)\s*g',
        'trans_fat': r'trans fat[^\d]*([0-9.]+)\s*g',
        'cholesterol': r'cholesterol[^\d]*([0-9.]+)\s*mg',
        'sodium': r'sodium[^\d]*([0-9.]+)\s*mg',
        'carbs': r'(?:total )?carbohydrate[s]?[^\d]*([0-9.]+)\s*g',
        'fiber': r'(?:dietary )?fiber[^\d]*([0-9.]+)\s*g',
        'sugar': r'(?:total )?sugars?[^\d]*([0-9.]+)\s*g',
        'protein': r'protein[^\d]*([0-9.]+)\s*g',
    }

    nutrition = {}
    for key, pattern in nutrient_patterns.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            nutrition[key] = float(match.group(1))
        else:
            nutrition[key] = 0.0

    # Extract vitamins/minerals
    vitamins = ['vitamin d', 'calcium', 'iron', 'potassium', 'vitamin a', 'vitamin c', 'vitamin e', 'vitamin k', 'thiamin', 'riboflavin', 'niacin', 'vitamin b6', 'folate', 'vitamin b12', 'biotin', 'pantothenic acid', 'phosphorus', 'iodine', 'magnesium', 'zinc', 'selenium', 'copper', 'manganese', 'chromium', 'molybdenum', 'chloride', 'choline']
    for vitamin in vitamins:
        pattern = rf'{vitamin}\s*([0-9.]+)\s*(mg|mcg|%)'
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            nutrition[vitamin.replace(' ', '_')] = match.group(1) + (match.group(2) or '')
        else:
            nutrition[vitamin.replace(' ', '_')] = ""

    # Optionally, add ingredients and serving size extraction if needed
    print('Extracted nutrition:', nutrition)
    return nutrition

def calculate_health_score(nutrition: Dict[str, Union[float, str, List[str]]]) -> float:
    score = 10.0
    calories = nutrition.get('calories', 0)
    protein = nutrition.get('protein', 0)
    carbs = nutrition.get('carbs', 0)
    fat = nutrition.get('fat', 0)
    fiber = nutrition.get('fiber', 0)
    sugar = nutrition.get('sugar', 0)
    sodium = nutrition.get('sodium', 0)
    
    # Calorie scoring (0-2000 is ideal)
    if calories > 2000:
        score -= (calories - 2000) / 500
    
    # Protein scoring (higher is better, up to 50g)
    protein_score = min(protein / 50, 1)
    score += protein_score
    
    # Carb scoring (lower is better, up to 300g)
    if carbs > 300:
        score -= (carbs - 300) / 100
    
    # Fat scoring (lower is better, up to 70g)
    if fat > 70:
        score -= (fat - 70) / 35
    
    # Fiber scoring (higher is better, up to 25g)
    fiber_score = min(fiber / 25, 1)
    score += fiber_score
    
    # Sugar scoring (lower is better, up to 50g)
    if sugar > 50:
        score -= (sugar - 50) / 25
    
    # Sodium scoring (lower is better, up to 2300mg)
    if sodium > 2300:
        score -= (sodium - 2300) / 1150
    
    # Ensure score is between 0 and 10
    return max(0, min(10, score))

def get_warnings_and_benefits(nutrition: Dict[str, Union[float, str, List[str]]]) -> tuple[List[str], List[str]]:
    warnings = []
    benefits = []
    
    # Check for high values
    if nutrition.get('sodium', 0) > 2300:
        warnings.append('High in sodium')
    if nutrition.get('sugar', 0) > 50:
        warnings.append('High in sugar')
    if nutrition.get('fat', 0) > 70:
        warnings.append('High in fat')
    if nutrition.get('calories', 0) > 2000:
        warnings.append('High in calories')
        
    # Check for beneficial values
    if nutrition.get('protein', 0) > 20:
        benefits.append('High in protein')
    if nutrition.get('fiber', 0) > 10:
        benefits.append('High in fiber')
    if nutrition.get('sugar', 0) < 10:
        benefits.append('Low in sugar')
    if nutrition.get('sodium', 0) < 500:
        benefits.append('Low in sodium')
        
    return warnings, benefits

def get_ingredients(text: str) -> List[str]:
    # Look for ingredients section
    patterns = [
        r'ingredients[:\s]*([^.]*?)(?:\.|$)',  # Until period or end
        r'contains[:\s]*([^.]*?)(?:\.|$)',     # Alternative format
        r'ingredients[:\s]*([^;]*?)(?:;|$)',   # Until semicolon or end
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            # Split by common separators and clean up
            ingredients = re.split(r'[,;]', match.group(1))
            return [i.strip() for i in ingredients if i.strip()]
    return []

def get_serving_size(text: str) -> str:
    patterns = [
        r'serving size[:\s]*([^.]*?)(?:\.|$)',
        r'serving[:\s]*([^.]*?)(?:\.|$)',
        r'per serving[:\s]*([^.]*?)(?:\.|$)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return ''

def safe_float(val):
    try:
        return float(re.sub(r'[^0-9.]', '', str(val)))
    except:
        return 0.0

def extract_full_nutrition(text: str) -> Dict[str, Union[float, str, List[str]]]:
    nutrition = extract_nutrition(text)
    
    # Calculate health score
    nutrition['health_score'] = calculate_health_score(nutrition)
    
    # Get warnings and benefits
    warnings, benefits = get_warnings_and_benefits(nutrition)
    nutrition['warnings'] = warnings
    nutrition['benefits'] = benefits
    
    # Extract ingredients and serving size
    nutrition['ingredients'] = get_ingredients(text)
    nutrition['serving_size'] = get_serving_size(text)
    
    # Convert all main nutrients to floats
    for key in ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium']:
        nutrition[key] = safe_float(nutrition.get(key, 0))
    
    return nutrition 
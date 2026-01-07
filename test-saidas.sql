SELECT id, description, amount, is_recurring, recurring_type, recurring_day 
FROM saidas 
WHERE is_recurring = true 
LIMIT 5;

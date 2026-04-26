# Bloomy Alexa Check-In Testing

Run the app locally, then send these requests to `http://localhost:5173/api/alexa`.

## LaunchRequest

```bash
curl -X POST http://localhost:5173/api/alexa \
  -H "Content-Type: application/json" \
  -d '{"request":{"type":"LaunchRequest"},"session":{"attributes":{}}}'
```

## Feeling Good

```bash
curl -X POST http://localhost:5173/api/alexa \
  -H "Content-Type: application/json" \
  -d '{"request":{"type":"IntentRequest","intent":{"name":"FeelingIntent","slots":{"feeling":{"value":"good"}}}},"session":{"attributes":{"step":"ASK_FEELING"}}}'
```

## Mass Gathering Yes/No

```bash
curl -X POST http://localhost:5173/api/alexa \
  -H "Content-Type: application/json" \
  -d '{"request":{"type":"IntentRequest","intent":{"name":"AMAZON.NoIntent"}},"session":{"attributes":{"step":"ASK_MASS_GATHERING","feeling":"good","symptoms":[]}}}'
```

```bash
curl -X POST http://localhost:5173/api/alexa \
  -H "Content-Type: application/json" \
  -d '{"request":{"type":"IntentRequest","intent":{"name":"AMAZON.YesIntent"}},"session":{"attributes":{"step":"ASK_MASS_GATHERING","feeling":"sick","symptoms":["cough","fatigue"],"duration":"two days","fever":false}}}'
```

## Sick Flow

```bash
curl -X POST http://localhost:5173/api/alexa \
  -H "Content-Type: application/json" \
  -d '{"request":{"type":"IntentRequest","intent":{"name":"FeelingIntent","slots":{"feeling":{"value":"sick"}}}},"session":{"attributes":{"step":"ASK_FEELING"}}}'
```

```bash
curl -X POST http://localhost:5173/api/alexa \
  -H "Content-Type: application/json" \
  -d '{"request":{"type":"IntentRequest","intent":{"name":"SymptomDetailIntent","slots":{"symptoms":{"value":"cough and fatigue"}}}},"session":{"attributes":{"step":"ASK_SYMPTOMS","feeling":"sick"}}}'
```

```bash
curl -X POST http://localhost:5173/api/alexa \
  -H "Content-Type: application/json" \
  -d '{"request":{"type":"IntentRequest","intent":{"name":"DurationIntent","slots":{"duration":{"value":"two days"}}}},"session":{"attributes":{"step":"ASK_DURATION","feeling":"sick","symptoms":["cough","fatigue"]}}}'
```

```bash
curl -X POST http://localhost:5173/api/alexa \
  -H "Content-Type: application/json" \
  -d '{"request":{"type":"IntentRequest","intent":{"name":"FeverIntent","slots":{"fever":{"value":"no"}}}},"session":{"attributes":{"step":"ASK_FEVER","feeling":"sick","symptoms":["cough","fatigue"],"duration":"two days"}}}'
```

```bash
curl -X POST http://localhost:5173/api/alexa \
  -H "Content-Type: application/json" \
  -d '{"request":{"type":"IntentRequest","intent":{"name":"AMAZON.NoIntent"}},"session":{"attributes":{"step":"ASK_MASS_GATHERING","feeling":"sick","symptoms":["cough","fatigue"],"duration":"two days","fever":false}}}'
```

## Manual Website Check-In API

```bash
curl -X POST http://localhost:5173/api/checkins \
  -H "Content-Type: application/json" \
  -d '{"userId":"demo-user","feeling":"sick","symptoms":["cough"],"duration":"one day","fever":false,"massGathering":"unknown","source":"web","dailyCheckInComplete":true}'
```

# Bloomy Alexa Setup

## 1. Endpoint

In the Alexa Developer Console, open your Bloomy skill and set:

- Endpoint type: `HTTPS`
- Default region endpoint: `https://www.bloomy.health/api/alexa`
- SSL certificate: `My development endpoint has a certificate from a trusted certificate authority`

## 2. Interaction Model

Go to `Build` -> `Interaction Model` -> `JSON Editor`.

Paste the contents of `alexa/interaction-model.json`, then click `Save Model` and `Build Model`.

## 3. Test

In the Alexa test panel, use:

- `open bloomy`
- `ask bloomy to test gemma`
- `tell bloomy to check in I feel sick with fever and cough and I was absent from work`

## 4. Quick Backend Check

Open this in a browser:

`https://www.bloomy.health/api/alexa`

It should return JSON with:

- `ok: true`
- `gemmaConfigured: true`

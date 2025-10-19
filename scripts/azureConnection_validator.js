import { AzureOpenAI } from "openai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// ✅ Load values from .env
const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-04-01-preview";
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
const modelName = process.env.AZURE_OPENAI_MODEL || deployment;

const options = { endpoint, apiKey, deployment, apiVersion };

async function validateAzureOpenAI() {
  try {
    const client = new AzureOpenAI(options);

    console.log("🔍 Validating Azure OpenAI configuration...");
    console.log("Endpoint:", endpoint);
    console.log("Deployment:", deployment);
    console.log("Model:", modelName);
    console.log("API Version:", apiVersion);

    const response = await client.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Respond with OK" }
      ],
      max_tokens: 10, // ✅ Corrected parameter name
      temperature: 0,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      model: modelName
    });

    console.log("✅ Response received:");
    console.log(response.choices[0].message.content);
  } catch (err) {
    console.error("❌ Validation failed:");
    console.error("Error:", err.message || err);
  }
}

validateAzureOpenAI();
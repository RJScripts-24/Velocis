import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

// Initialize the Bedrock client
const client = new BedrockRuntimeClient({ region: "us-east-1" });

export const handler = async (event) => {
    console.log("GitHub Webhook Payload:", event.body);

    // The payload we are sending to Claude Sonnet
    const payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1000,
        messages: [
            {
                role: "user",
                content: "Hello Claude! You are now connected as the Sentinel Agent for Velocis. Respond with a one-sentence greeting confirming you are online."
            }
        ]
    };

    try {
        const command = new InvokeModelCommand({
            // REPLACE THE STRING BELOW WITH YOUR EXACT CLAUDE 4.6 MODEL ID
            modelId: "anthropic.claude-4-6-sonnet-[insert-rest-of-id-here]",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(payload),
        });

        // Send the request to Bedrock
        const response = await client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));

        console.log("Sentinel AI Output:", responseBody.content[0].text);

        return { statusCode: 200, body: "Sentinel successfully invoked Claude!" };
    } catch (error) {
        console.error("Error calling Bedrock:", error);
        return { statusCode: 500, body: "Failed to wake up Sentinel." };
    }
};
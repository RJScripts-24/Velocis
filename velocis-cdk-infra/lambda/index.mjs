import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({ region: "us-east-1" });

export const handler = async (event) => {
    console.log("Webhook triggered!");

    // 1. Parse the GitHub payload
    const githubData = JSON.parse(event.body);
    const repoName = githubData.repository?.name || "Unknown Repo";
    const pusherName = githubData.pusher?.name || "A developer";
    const commits = githubData.commits || [];

    // If there are no commits (e.g., just a ping), exit early
    if (commits.length === 0) {
        return { statusCode: 200, body: "No commits found to review." };
    }

    // 2. Extract the latest commit details
    const latestCommit = commits[0];
    const commitMessage = latestCommit.message;
    const modifiedFiles = latestCommit.modified.join(", ");

    // 3. Give Claude a proper Engineering Prompt
    const promptText = `You are an expert Senior Software Engineer. A developer named ${pusherName} just pushed an update to the ${repoName} repository.
  
  Commit Message: "${commitMessage}"
  Files Modified: ${modifiedFiles}
  
  Based strictly on the commit message and the files modified, write a short, encouraging 2-sentence response acknowledging the update and briefly explaining why this file change makes sense for that commit.`;

    const payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 500,
        messages: [
            { role: "user", content: promptText }
        ]
    };

    try {
        const command = new InvokeModelCommand({
            modelId: "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(payload),
        });

        // 4. Send to Bedrock and log the response
        const response = await client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));

        console.log("Sentinel AI Review:", responseBody.content[0].text);

        return { statusCode: 200, body: "Review completed!" };
    } catch (error) {
        console.error("Error calling Bedrock:", error);
        return { statusCode: 500, body: "Failed to review." };
    }
};
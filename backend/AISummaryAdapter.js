import { OpenAI } from 'openai';

class AISummaryAdapter {
  constructor(apiKey) {
    this.client = new OpenAI({
      baseURL: 'https://router.huggingface.co/v1',
      apiKey: apiKey,
    });
  }

  async generate(data) {
    const prompt = `
Generate a concise professional summary from the following information:
Name: ${data.fullName}
Date of Birth: ${data.dateOfBirth}
Profession: ${data.profession}
Address: ${data.address}
Email: ${data.email}
Phone: ${data.phone}
ID Type: ${data.idType}
ID Number: ${data.idNumber}
`;

    try {
      const completion = await this.client.chat.completions.create({
        model: 'meta-llama/Llama-2-7b-chat-hf',
        messages: [
          {
            role: 'system',
            content: 'You are a professional summary generator. Generate a concise and professional summary.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
      });

      const content = completion.choices[0]?.message?.content || "Summary could not be generated.";
      return content;
    } catch (error) {
      console.error('Error generating summary with LLM:', error.message);
      // Fallback to a simple template-based summary if API fails
      console.log('Using fallback summary generation...');
      return this.generateFallbackSummary(data);
    }
  }

  generateFallbackSummary(data) {
    return `Professional Summary: ${data.fullName} is a ${data.profession} currently residing at ${data.address}. Contact: ${data.email} / ${data.phone}. Identification: ${data.idType} (${data.idNumber}). DOB: ${new Date(data.dateOfBirth).toLocaleDateString()}. This KYC application has been submitted for verification and processing.`;
  }
}

export default AISummaryAdapter;


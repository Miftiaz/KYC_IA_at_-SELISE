import OpenAI from 'openai';

class AISummaryAdapter {
  constructor(apiKey) {
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: apiKey,
      defaultHeaders: {
        'HTTP-Referer': process.env.SITE_URL || 'http://localhost',
        'X-Title': process.env.SITE_NAME || 'KYC-IA',
      },
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
        model: 'openrouter/auto', // Uses the cheapest available model
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
      });

      const content = completion.choices[0]?.message?.content || "Summary could not be generated.";
      return content;
    } catch (error) {
      console.error('Error generating summary:', error.message);
      throw error;
    }
  }
}

export default AISummaryAdapter;

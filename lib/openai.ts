import OpenAI from "openai";

let _openai: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.ZHIPU_API_KEY,
      baseURL: "https://open.bigmodel.cn/api/paas/v4/",
    });
  }
  return _openai;
}


import { GoogleGenAI, Type } from "@google/genai";
import { GameState, APIResponse, Attributes, Talent } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `你是一位名为《无限人生：重塑》的游戏引擎。
你的任务是根据玩家的状态、年龄、属性和选择，生成极具戏剧性和逻辑性的人生事件。
规则：
1. 属性范围0-100（初始值除外）。
2. 经济系统：模拟通胀，初职起薪万级，高管/创业可达千万乃至亿级。
3. 选项设计：每次给出3-4个选项。必须包含一个“高风险高收益”选项（如投资、激进决策）。
4. 社交系统：动态生成NPC，关系度0-100。
5. 死亡判定：体魄(STR)掉至0或年龄达到100岁，或发生极端致命事件。
6. 输出必须是合法的JSON格式。`;

export async function generateInitialState(): Promise<{ attributes: Attributes; talents: Talent[] }> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "请随机生成一组初始属性（总和20，包含INT, CHA, STR, FIN, LUK）和三个极具特色的可选天赋。",
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          attributes: {
            type: Type.OBJECT,
            properties: {
              INT: { type: Type.INTEGER },
              CHA: { type: Type.INTEGER },
              STR: { type: Type.INTEGER },
              FIN: { type: Type.INTEGER },
              LUK: { type: Type.INTEGER },
            }
          },
          talents: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                description: { type: Type.STRING },
              }
            }
          }
        }
      }
    }
  });

  return JSON.parse(response.text);
}

export async function processYear(state: GameState, choiceText: string): Promise<APIResponse> {
  const prompt = `
  当前年龄: ${state.age}
  当前属性: ${JSON.stringify(state.attributes)}
  当前存款: ${state.money}
  已有天赋: ${state.talents.map(t => t.name).join(", ")}
  社交关系: ${JSON.stringify(state.npcs)}
  上一步选择: ${choiceText}
  
  请推进人生到下一阶段（通常是1-5年，或者关键年龄节点）。生成一个突发事件、属性变化、资产变化，并提供接下来的选择。
  如果是致命事件或达到100岁，请设置 isGameOver 为 true。
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          eventDescription: { type: Type.STRING },
          attributeChanges: {
            type: Type.OBJECT,
            properties: {
              INT: { type: Type.INTEGER },
              CHA: { type: Type.INTEGER },
              STR: { type: Type.INTEGER },
              FIN: { type: Type.INTEGER },
              LUK: { type: Type.INTEGER },
            }
          },
          moneyChange: { type: Type.NUMBER },
          newNpcs: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                relationType: { type: Type.STRING },
                favourability: { type: Type.INTEGER },
                description: { type: Type.STRING },
              }
            }
          },
          choices: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                text: { type: Type.STRING },
                risk: { type: Type.STRING },
                requirement: { type: Type.STRING },
              }
            }
          },
          isGameOver: { type: Type.BOOLEAN },
          deathReason: { type: Type.STRING },
          achievements: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["eventDescription", "attributeChanges", "moneyChange", "choices", "isGameOver"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function summarizeLife(state: GameState): Promise<string> {
  const prompt = `
  总结这名玩家的一生：
  最终年龄: ${state.age}
  最终资产: ${state.money}
  达成成就: ${state.achievements.join(", ")}
  人生轨迹: ${state.history.map(h => `[${h.age}岁] ${h.description}`).join(" -> ")}
  
  请写一篇感人肺腑或辛辣讽刺的一生总结，并给出最终的人生态度。
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      systemInstruction: "你是一位智慧的长者，正在为逝去的人写墓志铭。字数限制在300字以内。",
    }
  });

  return response.text;
}

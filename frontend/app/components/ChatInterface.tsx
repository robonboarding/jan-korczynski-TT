"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from 'react-markdown';

interface Message {
    role: "user" | "assistant";
    content: string;
    embedding?: number[];
}

export default function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [expandedEmbedding, setExpandedEmbedding] = useState<number | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, expandedEmbedding]);

    const [sessionId] = useState(() => Math.random().toString(36).substring(7));

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage: Message = { role: "user", content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            // Send to local Next.js API route, which proxies to Backend
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: userMessage.content,
                    session_id: sessionId
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Failed to fetch response");
            }

            const data = await response.json();
            const botMessage: Message = {
                role: "assistant",
                content: data.response,
                embedding: data.embedding
            };
            setMessages((prev) => [...prev, botMessage]);
        } catch (error) {
            console.error("Error sending message:", error);
            const errorMessage = error instanceof Error ? error.message : "Sorry, something went wrong.";
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: `Error: ${errorMessage}` },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[700px] w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <div className="bg-blue-600 p-4 text-white">
                <h2 className="text-xl font-bold">Rabobank Assistant</h2>
                <p className="text-sm opacity-90">Powered by Azure OpenAI</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-zinc-50 dark:bg-zinc-950">
                {messages.length === 0 && (
                    <div className="flex items-center justify-center h-full text-zinc-400">
                        <p className="text-center">Start a conversation.<br />Each message will be embedded automatically.</p>
                    </div>
                )}
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"
                            }`}
                    >
                        <div
                            className={`max-w-[85%] px-4 py-3 rounded-2xl ${msg.role === "user"
                                ? "bg-blue-600 text-white rounded-tr-none"
                                : "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-tl-none shadow-sm"
                                }`}
                        >
                            <div className="prose dark:prose-invert text-sm max-w-none break-words [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4 [&>li]:mb-1 [&>strong]:font-bold [&>h3]:text-base [&>h3]:font-bold [&>h3]:mb-2 [&>h3]:mt-4">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                        </div>

                        {msg.embedding && (
                            <div className="mt-2 text-xs flex flex-col items-start gap-1 max-w-[85%]">
                                <button
                                    onClick={() => setExpandedEmbedding(expandedEmbedding === index ? null : index)}
                                    className="text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-1"
                                >
                                    <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                                    {expandedEmbedding === index ? "Hide Vector" : "View Embedding vector"}
                                </button>
                                {expandedEmbedding === index && (
                                    <div className="p-2 bg-zinc-200 dark:bg-zinc-900 rounded-md w-full overflow-x-auto font-mono text-[10px] text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700">
                                        [{msg.embedding.slice(0, 5).map(n => n.toFixed(4)).join(", ")}, ... {msg.embedding.length} dim]
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 px-4 py-2 rounded-2xl rounded-tl-none shadow-sm animate-pulse">
                            Thinking...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                        placeholder="Type your message..."
                        disabled={isLoading}
                        className="flex-1 px-4 py-2 rounded-full border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={isLoading || !input.trim()}
                        className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}

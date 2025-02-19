const getCommandHighlight = (command) => {
  if (!command || !commandDefs[command]) return null;
  
  const inputParts = input.split(' ');
  const syntax = commandDefs[command].syntax.split(' ');
  
  return syntax.map((part, index) => {
    const isCompleted = index < inputParts.length;
    const isCurrent = index === inputParts.length - 1;
    
    return {
      text: part,
      status: isCompleted ? 'completed' : isCurrent ? 'current' : 'pending'
    };
  });
};

const renderSyntaxHighlight = (command) => {
  const highlighted = getCommandHighlight(command);
  if (!highlighted) return null;

  return (
    <div className="pl-5 font-mono text-xs space-x-1">
      {highlighted.map((part, index) => (
        <span
          key={index}
          className={`${
            part.status === 'completed' ? 'text-white' :
            part.status === 'current' ? 'text-yellow-400' :
            'text-zinc-500'
          }`}
        >
          {part.text}
        </span>
      ))}
    </div>
  );
};import React, { useState, useEffect } from 'react';
import { Terminal, Grid, FolderOpen, Download } from 'lucide-react';

const NFTPlatform = () => {


const [input, setInput] = useState('');
const [history, setHistory] = useState([{
  type: 'system',
  content: `Welcome to Illusia AI\nType "help" for commands`
}]);
const [nfts, setNfts] = useState([]);
const [activeTab, setActiveTab] = useState('terminal');
const [isGenerating, setIsGenerating] = useState(false);
const [suggestions, setSuggestions] = useState([]);
const [showSuggestions, setShowSuggestions] = useState(false);

// Available commands for autocomplete
const availableCommands = {
  'create': {
    syntax: 'create [name] --collection [collection] --prompt [description]',
    description: 'Create a new NFT with AI-generated image',
    parameters: ['name', 'collection', 'prompt']
  },
  'help': {
    syntax: 'help',
    description: 'Show all available commands'
  }
};

useEffect(() => {
  const savedNfts = localStorage.getItem('nfts');
  if (savedNfts) {
    setNfts(JSON.parse(savedNfts));
  }
}, []);

useEffect(() => {
  localStorage.setItem('nfts', JSON.stringify(nfts));
}, [nfts]);

// Command definitions and syntax highlighting
const commandDefs = {
  'create': {
    syntax: 'create [name] --collection [collection] --prompt [description]',
    description: 'Create a new NFT with AI-generated image',
    parameters: ['name', 'collection', 'prompt']
  },
  'help': {
    syntax: 'help',
    description: 'Show all available commands'
  }
};

// Handle autocomplete suggestions
useEffect(() => {
  if (input.trim()) {
    const inputWords = input.trim().split(' ');
    const currentWord = inputWords[inputWords.length - 1];

    if (inputWords.length === 1) {
      // Suggest commands
      const matchingCommands = Object.keys(commandDefs)
        .filter(cmd => cmd.startsWith(currentWord.toLowerCase()))
        .map(cmd => ({
          text: cmd,
          description: commandDefs[cmd].description
        }));
      setSuggestions(matchingCommands);
    } else if (input.includes('--')) {
      // Suggest parameters
      const params = ['--collection', '--prompt'];
      const matchingParams = params
        .filter(param => param.startsWith(currentWord))
        .map(param => ({
          text: param,
          description: param === '--collection' ? 'Specify collection name' : 'Specify image prompt'
        }));
      setSuggestions(matchingParams);
    }
    setShowSuggestions(suggestions.length > 0);
  } else {
    setSuggestions([]);
    setShowSuggestions(false);
  }
}, [input]);

const handleDownload = async (imageUrl, name) => {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading image:', error);
  }
};

const generateImage = async (prompt) => {
  try {
    setIsGenerating(true);
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('output_format', 'jpeg');

    const response = await fetch('https://api.stability.ai/v2beta/stable-image/generate/sd3', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer sk-MO6HvnwwIjCVREjqs6YUfeVIp7u4dixm33kvpZ5Abu2ggAHP`,
        'Accept': 'image/*'
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Failed to generate image: ${response.status}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  } finally {
    setIsGenerating(false);
  }
};

const commands = {
  create: async (args) => {
    const params = parseArgs(args);
    if (!params.name || !params.prompt) {
      return {
        type: 'error',
        content: 'Usage: create [name] --collection [collection] --prompt [description]'
      };
    }

    try {
      const imageUrl = await generateImage(params.prompt);
      
      const nft = {
        id: Date.now(),
        name: params.name,
        collection: params.collection || 'Default',
        prompt: params.prompt,
        image: imageUrl,
        createdAt: new Date().toISOString()
      };

      setNfts(prev => [...prev, nft]);

      return {
        type: 'success',
        content: `NFT "${params.name}" created and saved successfully!\nCollection: ${params.collection || 'Default'}\nPrompt: ${params.prompt}`
      };
    } catch (error) {
      return {
        type: 'error',
        content: `Failed to create NFT: ${error.message}`
      };
    }
  },
  help: () => ({
    type: 'system',
    content: `Available commands:
• create [name] --collection [collection] --prompt [description]
• help`
  })
};

const handleCommand = async (e) => {
  e.preventDefault();
  if (!input.trim()) return;
  
  // Se as sugestões estiverem visíveis e o usuário pressionar Enter,
  // seleciona a primeira sugestão
  if (showSuggestions && suggestions.length > 0 && e.key === 'Enter') {
    handleSuggestionClick(suggestions[0]);
    return;
  }

  const newHistory = [...history, { type: 'command', content: `> ${input}` }];
  const [command, ...args] = input.trim().split(' ');
  const handler = commands[command.toLowerCase()];
  
  if (handler) {
    const result = await handler(args.join(' '));
    if (result) newHistory.push(result);
  } else {
    newHistory.push({
      type: 'error',
      content: `Command not found. Type "help" for commands.`
    });
  }
  
  setHistory(newHistory);
  setInput('');
  setShowSuggestions(false);
};

const handleSuggestionClick = (suggestion) => {
  const words = input.split(' ');
  words[words.length - 1] = suggestion.text;
  const newInput = words.join(' ') + ' ';
  setInput(newInput);
  setShowSuggestions(false);
  
  // Focus input after selecting a suggestion
  const inputElement = document.querySelector('input[type="text"]');
  if (inputElement) {
    inputElement.focus();
  }
};

const parseArgs = (argsString) => {
  const args = argsString.split('--');
  const params = {};
  
  args[0] = args[0].trim();
  if (args[0]) params.name = args[0];

  args.slice(1).forEach(arg => {
    const [key, ...value] = arg.trim().split(' ');
    params[key] = value.join(' ');
  });

  return params;
};

const NFTCard = ({ nft }) => (
  <div className="bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 transition-transform hover:scale-[1.02]">
    <img 
      src={nft.image} 
      alt={nft.name}
      className="w-full aspect-square object-cover"
    />
    <div className="p-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-zinc-100 text-lg font-medium">{nft.name}</h3>
          <p className="text-zinc-400 text-sm">Collection: {nft.collection}</p>
        </div>
        <button
          onClick={() => handleDownload(nft.image, nft.name)}
          className="text-zinc-400 hover:text-zinc-100 transition-colors"
          title="Download image"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>
      <p className="text-zinc-500 text-sm mt-2 line-clamp-2">{nft.prompt}</p>
      <div className="mt-4">
        <span className="text-zinc-500 text-sm">
          {new Date(nft.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  </div>
);

return (
  <div className="flex flex-col h-screen bg-black">
    <nav className="border-b border-zinc-800 bg-zinc-950">
      <div className="w-full px-4 py-3 flex items-center gap-3">
        <img 
          src="https://cdn.discordapp.com/attachments/905826668298518560/1341579259524812810/YY__KyXw_400x400.png?ex=67b6828c&is=67b5310c&hm=068ec2576d93a06fc543349be7fe2e27ebcc32e2d04ffc2de209560d2ec4275b" 
          alt="Illusia AI Logo" 
          className="w-8 h-8 rounded-full"
        />
        <h1 className="text-zinc-100 text-xl font-medium">Illusia AI</h1>
      </div>
    </nav>

    <main className="flex-1 w-full p-4 space-y-6 overflow-auto">
      <div className="flex space-x-1 bg-zinc-900/50 p-1 rounded-lg w-fit">
        {[
          { id: 'terminal', icon: Terminal, label: 'Terminal' },
          { id: 'gallery', icon: Grid, label: 'Gallery' },
          { id: 'collections', icon: FolderOpen, label: 'Collections' }
        ].map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center px-4 py-2 rounded-md transition-colors ${
              activeTab === id 
                ? 'bg-zinc-800 text-white' 
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <Icon className="w-4 h-4 mr-2" />
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-[600px]">
        {activeTab === 'terminal' && (
          <div className="bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800">
            <div className="bg-zinc-900 p-2 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500"></div>
              </div>
              <div className="flex items-center gap-2">
                <img 
                  src="https://cdn.discordapp.com/attachments/905826668298518560/1341579259524812810/YY__KyXw_400x400.png?ex=67b6828c&is=67b5310c&hm=068ec2576d93a06fc543349be7fe2e27ebcc32e2d04ffc2de209560d2ec4275b" 
                  alt="Illusia AI Logo" 
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-zinc-400 text-sm">Illusia AI Terminal</span>
              </div>
            </div>
            <div className="p-4 font-mono text-sm h-[500px] overflow-y-auto">
              <div className="flex justify-center mb-6">
                <div className="flex flex-col items-center">
                  <img 
                    src="https://cdn.discordapp.com/attachments/905826668298518560/1341579259524812810/YY__KyXw_400x400.png?ex=67b6828c&is=67b5310c&hm=068ec2576d93a06fc543349be7fe2e27ebcc32e2d04ffc2de209560d2ec4275b" 
                    alt="Illusia AI Logo" 
                    className="w-20 h-20 rounded-full mb-4"
                  />
                  <h2 className="text-zinc-100 text-xl font-medium mb-2">Welcome to Illusia AI</h2>
                  <p className="text-zinc-400 text-sm">Type "help" for available commands</p>
                </div>
              </div>
              {history.map((entry, index) => (
                <div 
                  key={index}
                  className={`mb-2 ${
                    entry.type === 'error' ? 'text-red-400' :
                    entry.type === 'success' ? 'text-emerald-400' :
                    entry.type === 'command' ? 'text-zinc-400' :
                    'text-zinc-300'
                  }`}
                >
                  <pre className="whitespace-pre-wrap">{entry.content}</pre>
                </div>
              ))}
              <form onSubmit={handleCommand} className="mt-2 flex items-center relative">
                <span className="text-emerald-400 mr-2">❯</span>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab' && suggestions.length > 0) {
                      e.preventDefault();
                      handleSuggestionClick(suggestions[0]);
                    } else if (e.key === 'Escape') {
                      setShowSuggestions(false);
                    }
                  }}
                  className="flex-1 bg-transparent text-zinc-100 outline-none"
                  autoFocus
                  disabled={isGenerating}
                />
                {showSuggestions && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-zinc-800/95 rounded-lg border border-zinc-700 overflow-hidden backdrop-blur-sm">
                    <div className="p-2 border-b border-zinc-700 text-xs text-zinc-400">
                      Available commands:
                    </div>
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-4 py-3 hover:bg-zinc-700/50 cursor-pointer border-b border-zinc-700/50 last:border-0"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-emerald-400">❯</span>
                          <span className="text-zinc-100 font-medium">{suggestion.text}</span>
                        </div>
                        <div className="mt-1 text-sm text-zinc-400 pl-5">
                          {suggestion.description}
                        </div>
                        {suggestion.text === 'create' && (
                          <div className="mt-1">
                            {renderSyntaxHighlight('create')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </form>
              {isGenerating && (
                <div className="mt-2 text-zinc-400">
                  Generating image... Please wait...
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'gallery' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {nfts.map((nft) => (
              <NFTCard key={nft.id} nft={nft} />
            ))}
            {nfts.length === 0 && (
              <div className="col-span-3 flex flex-col items-center justify-center h-[600px] text-zinc-400">
                <Grid className="w-12 h-12 mb-4 opacity-50" />
                <p>No NFTs created yet. Use the terminal to create your first NFT.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'collections' && (
          <div className="space-y-8">
            {Array.from(new Set(nfts.map(nft => nft.collection))).map(collection => (
              <div key={collection} className="space-y-4">
                <h2 className="text-zinc-100 text-xl font-medium">{collection}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {nfts
                    .filter(nft => nft.collection === collection)
                    .map(nft => (
                      <NFTCard key={nft.id} nft={nft} />
                    ))}
                </div>
              </div>
            ))}
            {nfts.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[600px] text-zinc-400">
                <FolderOpen className="w-12 h-12 mb-4 opacity-50" />
                <p>No collections yet. Create NFTs to start organizing them into collections.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  </div>
);
};

export default NFTPlatform;
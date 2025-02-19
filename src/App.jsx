import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Grid, FolderOpen, Download } from 'lucide-react';

const NFTPlatform = () => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([{
    type: 'system',
    content: `Welcome to NFT AI Creator\nType "help" for commands`
  }]);
  const [nfts, setNfts] = useState([]);
  const [activeTab, setActiveTab] = useState('terminal');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  // Load NFTs from localStorage when component mounts
  useEffect(() => {
    const savedNfts = localStorage.getItem('nfts');
    if (savedNfts) {
      setNfts(JSON.parse(savedNfts));
    }
  }, []);

  // Save NFTs to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('nfts', JSON.stringify(nfts));
  }, [nfts]);

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

  const generateImage = async (prompt) => {
    // ... (mantenha o código existente do generateImage)
  };

  const handleCommand = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

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

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);

    // Autocomplete logic
    if (value.trim()) {
      const parts = value.trim().split(' ');
      const currentInput = parts[parts.length - 1];
      
      // If starting a command
      if (parts.length === 1) {
        const availableCommands = Object.keys(commands);
        const matches = availableCommands.filter(cmd => 
          cmd.startsWith(currentInput.toLowerCase())
        );
        setSuggestions(matches);
        setShowSuggestions(matches.length > 0);
      } 
      // If in a create command
      else if (parts[0] === 'create') {
        // If typing after --collection flag
        if (currentInput.startsWith('--') || parts.includes('--collection')) {
          const collections = new Set(nfts.map(nft => nft.collection));
          collections.add('Default'); // Always include Default collection
          
          if (currentInput.startsWith('--')) {
            const flags = ['--collection', '--prompt'];
            const matches = flags.filter(flag => flag.startsWith(currentInput));
            setSuggestions(matches);
          } else {
            const matches = Array.from(collections).filter(collection =>
              collection.toLowerCase().startsWith(currentInput.toLowerCase())
            );
            setSuggestions(matches);
          }
          setShowSuggestions(true);
        }
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    const parts = input.trim().split(' ');
    
    if (parts.length === 1) {
      // If completing a command
      setInput(suggestion);
    } else {
      // If completing a collection or flag
      const newParts = [...parts];
      newParts[parts.length - 1] = suggestion;
      setInput(newParts.join(' '));
    }
    
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab' && suggestions.length > 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[0]);
    }
  };

  const downloadNFT = async (nft) => {
    try {
      const response = await fetch(nft.image);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${nft.name}-${nft.collection}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading NFT:', error);
    }
  };

  const NFTCard = ({ nft, showCollection = false }) => (
    <div className="bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 transition-transform hover:scale-[1.02]">
      <div className="relative group">
        <img 
          src={nft.image} 
          alt={nft.name}
          className="w-full aspect-square object-cover"
        />
        <button
          onClick={() => downloadNFT(nft)}
          className="absolute top-2 right-2 p-2 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
          title="Download NFT"
        >
          <Download className="w-5 h-5 text-white" />
        </button>
      </div>
      <div className="p-4">
        <h3 className="text-zinc-100 text-lg font-medium">{nft.name}</h3>
        {showCollection && (
          <p className="text-zinc-400 text-sm">Collection: {nft.collection}</p>
        )}
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
        <div className="w-full px-4 py-4">
          <h1 className="text-zinc-100 text-xl font-medium">NFT AI Creator</h1>
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
          {/* Terminal Tab */}
          {activeTab === 'terminal' && (
            <div className="bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800">
              <div className="bg-zinc-900 p-2 border-b border-zinc-800 flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500"></div>
              </div>
              <div className="p-4 font-mono text-sm h-[500px] overflow-y-auto">
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
                <div className="relative mt-2">
                  <form onSubmit={handleCommand} className="flex items-center">
                    <span className="text-emerald-400 mr-2">❯</span>
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      className="flex-1 bg-transparent text-zinc-100 outline-none"
                      autoFocus
                      disabled={isGenerating}
                    />
                  </form>
                  {showSuggestions && (
                    <div className="absolute left-0 right-0 mt-1 bg-zinc-800 rounded-md overflow-hidden">
                      {suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full px-4 py-2 text-left text-zinc-300 hover:bg-zinc-700"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {isGenerating && (
                  <div className="mt-2 text-zinc-400">
                    Generating image... Please wait...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Gallery Tab */}
          {activeTab === 'gallery' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {nfts.map((nft) => (
                <NFTCard key={nft.id} nft={nft} showCollection={true} />
              ))}
              {nfts.length === 0 && (
                <div className="col-span-3 flex flex-col items-center justify-center h-[600px] text-zinc-400">
                  <Grid className="w-12 h-12 mb-4 opacity-50" />
                  <p>No NFTs created yet. Use the terminal to create your first NFT.</p>
                </div>
              )}
            </div>
          )}

          {/* Collections Tab */}
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
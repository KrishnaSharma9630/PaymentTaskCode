import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { FaTimes, FaProjectDiagram, FaUndo, FaRedo, FaSave, FaUpload } from 'react-icons/fa';
import { FaGooglePay, FaApplePay, FaCcVisa, FaCcMastercard, FaAmazon } from 'react-icons/fa';
import dagre from 'dagre';

const initialEdges = [];

const paymentProviders = [
  'Select Payment Method',
  'Google Pay',
  'Apple Pay',
  'Stripe',
  'PayPal',
  'Amazon Pay',
];

const paymentProviderIcons = {
  'Google Pay': <FaGooglePay color="#4285F4" />,
  'Apple Pay': <FaApplePay color="#A3AAAE" />,
  'Stripe': <FaCcVisa color="#6772E5" />,
  'PayPal': <FaCcMastercard color="#009CDA" />,
  'Amazon Pay': <FaAmazon color="#FF9900" />,
};

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([
    {
      id: 'payment-initialize',
      type: 'input',
      data: {
        label: (
          <div className='payment-initializer'>
            <span style={{ marginBottom: '5px' }}>Payment Initialize</span>


            <input
              type="number"
              placeholder="Enter amount"
              style={{ padding: '5px', width: '100%' }}
              onChange={(e) => handleAmountChange(e.target.value)}
            />
          </div>
        ),
      },
      position: { x: 50, y: 100 },
    },
    {
      id: 'provider-1',
      type: 'default',
      data: { provider: 'Provider 1', label: 'Provider 1' },
      position: { x: 300, y: 50 },
    },
    {
      id: 'provider-2',
      type: 'default',
      data: { provider: 'Provider 2', label: 'Provider 2' },
      position: { x: 300, y: 150 },
    },
  ]);

  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [error, setError] = useState(null);
  const [amount, setAmount] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState(paymentProviders[0]);
  const [isValidAmount, setIsValidAmount] = useState(false);
  const [isConnectedToProvider, setIsConnectedToProvider] = useState(false);

  const undoStack = useRef([]);
  const redoStack = useRef([]);

  //////////////////////////////////// Function to handle amount input change //////////////

  const handleAmountChange = useCallback((value) => {
    const newAmount = parseFloat(value);
    setAmount(newAmount);

    if (isNaN(newAmount)) {
      setError(null);
      setIsValidAmount(false);
      return;
    }

    const updatedNodes = nodes.map((node) => {
      if (node.id === 'payment-initialize') {
        let newStyle = { backgroundColor: 'lightgreen', color: 'black' };

        if (newAmount > 10) {
          newStyle = { backgroundColor: 'red', color: 'black' };
          setError('Amount cannot exceed $10!');
          setIsValidAmount(false);
        } else {
          setError(null);
          setIsValidAmount(true);
        }

        return {
          ...node,
          style: newStyle,
        };
      }
      return node;
    });

    setNodes((prevNodes) => {
      const nodesToUpdate = updatedNodes.filter((node) => prevNodes.some((n) => n.id === node.id));
      return [...prevNodes.map((n) => nodesToUpdate.find((updated) => updated.id === n.id) || n)];
    });
  }, [nodes, setNodes]);

  //////////////////////////////////// Function for handle auto layout using Dagre /////////////////////////////


  const handleAutoLayout = useCallback(() => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB' });
    g.setDefaultEdgeLabel(() => ({}));

    nodes.forEach((node) => {
      g.setNode(node.id, { width: 100, height: 50 });
    });

    edges.forEach((edge) => {
      g.setEdge(edge.source, edge.target);
    });

    dagre.layout(g);

    const updatedNodes = nodes.map((node) => {
      const { x, y } = g.node(node.id);
      return {
        ...node,
        position: { x, y },
      };
    });

    setNodes(updatedNodes);
  }, [nodes, edges, setNodes]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.key === 'l') {
        event.preventDefault();
        handleAutoLayout();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleAutoLayout]);

  /////////////////////////// Function to add a new provider node ///////////////////////


  const addProviderNode = useCallback((provider) => {
    const nodeExists = nodes.some((node) => node.data.provider === provider);

    if (nodeExists) {
      setError(`${provider} already exists!`);
      setTimeout(() => {
        setError(null);
      }, 1000);
    } else {
      const newNode = {
        id: `${provider}-${nodes.length + 1}`,
        type: 'default',
        data: {
          provider,
          label: (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ fontSize: '24px' }}> {/* Adjusted icon size here */}
                {paymentProviderIcons[provider]}
              </div>
              <span style={{ marginLeft: '12px' }}>{provider}</span> {/* Increased margin for more space */}
              <button className='button-one'
                onClick={() => onDeleteNode(`${provider}-${nodes.length + 1}`)}
                title="Delete Node"
              >
                <FaTimes />
              </button>
            </div>
          ),
        },
        position: { x: Math.random() * 250 + 300, y: Math.random() * 250 },
      };
      undoStack.current.push({ action: 'addNode', nodes: [...nodes], edges: [...edges] });
      redoStack.current = [];
      setNodes((nds) => [...nds, newNode]);
      setError(null);
    }
  }, [nodes, edges, setNodes]);

  ////////////////////////////////////// Function for delete a node ////////////////////////

  const onDeleteNode = (id) => {
    undoStack.current.push({ action: 'deleteNode', nodes: [...nodes], edges: [...edges] });
    redoStack.current = [];
    setNodes((nds) => nds.filter((node) => node.id !== id));
  };
  //////////////////// Function for handle connection between nodes //////////////////////
  const onConnect = useCallback((params) => {
    const sourceNode = nodes.find((node) => node.id === params.source);
    const targetNode = nodes.find((node) => node.id === params.target);

    const isPaymentInitialize = sourceNode && sourceNode.id === 'payment-initialize';
    const isProviderNode = targetNode && targetNode.data.provider && paymentProviders.includes(targetNode.data.provider);

    if ((isPaymentInitialize && isProviderNode) || (sourceNode.data.provider && targetNode.data.provider)) {
      setEdges((eds) => addEdge(params, eds));
      setIsConnectedToProvider(isPaymentInitialize && isProviderNode);

    } else {
      setError('Unable to connect. Ensure you are connecting from the payment initializer or to another provider node.');
      setIsConnectedToProvider(false);
      setTimeout(() => {
        setError(null);
      }, 1000)

    }

  }, [nodes, setEdges]);
  ///////////////////  Function to handle provider dropdown change  ////////////////////
  const handleProviderChange = (e) => {
    const provider = e.target.value;
    setSelectedProvider(provider);

    if (provider !== 'Select Payment Method') {
      addProviderNode(provider);
      setSelectedProvider('Select Payment Method');
    }
  };
  /////////////////////////   Undo and Redo operations  /////////////////////////////
  const handleUndo = () => {
    if (undoStack.current.length === 0) return;

    const lastAction = undoStack.current.pop();
    redoStack.current.push({ nodes: [...nodes], edges: [...edges] });

    setNodes(lastAction.nodes);
    setEdges(lastAction.edges);
  };

  const handleRedo = () => {
    if (redoStack.current.length === 0) return;

    const nextAction = redoStack.current.pop();
    undoStack.current.push({ nodes: [...nodes], edges: [...edges] });

    setNodes(nextAction.nodes);
    setEdges(nextAction.edges);
  };
  ////////////////////////////     Function to save workflow to local storage   ///////////////////////////
  const handleSave = () => {
    try {
      const serializedNodes = nodes.map(({ id, type, data, position }) => ({
        id,
        type,
        data: {
          provider: data.provider,
          label: typeof data.label === 'object' ? 'SerializedLabel' : data.label,
        },
        position,
      }));
      const serializedEdges = edges.map(({ id, source, target }) => ({
        id,
        source,
        target,
      }));

      localStorage.setItem('nodes', JSON.stringify(serializedNodes));
      localStorage.setItem('edges', JSON.stringify(serializedEdges));

      setError('Workflow saved successfully!');
      setTimeout(() => setError(null), 2000);
    } catch (error) {
      console.error('Error saving workflow:', error);
      setError('Failed to save workflow. Please try again.');
      setTimeout(() => setError(null), 2000);
    }
  };

  ////////////////////////////////////    Function to upload workflow from local storage   ///////////////////
  const handleLoad = () => {
    try {
      const savedNodes = localStorage.getItem('nodes');
      const savedEdges = localStorage.getItem('edges');

      if (savedNodes && savedEdges) {
        const nodesData = JSON.parse(savedNodes);
        const edgesData = JSON.parse(savedEdges);

        const deserializedNodes = nodesData.map((node) => ({
          ...node,
          data: {
            ...node.data,
            label: node.data.label === 'SerializedLabel'
              ? (<div className='payment-initializer'>Payment Initialize</div>)
              : node.data.label,
          },
        }));

        setNodes(deserializedNodes);
        setEdges(edgesData);

        setError('Workflow loaded successfully!');
        setTimeout(() => setError(null), 2000);
      } else {
        setError('No saved workflow found.');
        setTimeout(() => setError(null), 2000);
      }
    } catch (error) {
      console.error('Error loading workflow:', error);
      setError('Failed to load workflow. Please try again.');
      setTimeout(() => setError(null), 2000);
    }
  };

  //////////////////////////////////  code for export as JSON  ////////////////////////////

  const exportAsJson = () => {
    const workflowData = {
      nodes,
      edges,
    };

    const dataStr = JSON.stringify(workflowData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'workflow.json';
    link.click();

    URL.revokeObjectURL(url);
  };

  //////////////////////////////////  code for Import as JSON  ////////////////////////////

  const importFromJson = (event) => {
    const file = event.target.files[0];

    if (file) {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const workflowData = JSON.parse(e.target.result);

          if (workflowData.nodes && workflowData.edges) {

            const deserializedNodes = workflowData.nodes.map((node) => {
              const isSerializedLabel = node.data.label === 'SerializedLabel';

              return {
                ...node,
                data: {
                  ...node.data,
                  label: isSerializedLabel
                    ? (
                      <div className='payment-initializer'>
                        <span>Payment Initialize</span>
                        <input
                          type="number"
                          placeholder="Enter amount"
                          style={{ padding: '5px', width: '100%' }}
                          onChange={(e) => handleAmountChange(e.target.value)}
                        />
                      </div>
                    )
                    : node.data.label,
                },
              };
            });

            setNodes(deserializedNodes);
            setEdges(workflowData.edges);
            setError('Workflow imported successfully!');
          } else {
            setError('Invalid workflow data.');
          }
        } catch (error) {
          console.error('Error importing workflow:', error);
          setError('Failed to import workflow. Please ensure the file is valid.');
        }
      };

      reader.readAsText(file);
    }
  };



  return (
    //////////////////////// Header Buttons //////////////////////////
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      <header className='header'>
        <select
          value={selectedProvider}
          onChange={handleProviderChange}
          className="dropdown"
        >
          {paymentProviders.map((provider) => (
            <option key={provider} value={provider}>
              {provider}
            </option>
          ))}
        </select>

        <div className='autoLayout'
          onClick={handleAutoLayout}
          title="Auto Layout">
          <FaProjectDiagram className='projectDiagram' />
          <span>Auto Layout</span>
        </div>

        <button
          className='undo'
          onClick={handleUndo}
        >
          <FaUndo style={{ marginRight: '5px' }} /> Undo
        </button>
        <button
          onClick={handleRedo}
          className='redo' >
          <FaRedo style={{ marginRight: '5px' }} /> Redo
        </button>

        <button
          onClick={handleSave}
          className='saveButton'
        >
          <FaSave style={{ marginRight: '5px' }} /> Save
        </button>

        <button
          onClick={handleLoad}
          className='loadContent' >
          <FaUpload style={{ marginRight: '5px' }} /> Load
        </button>
        <button
          className='export'
          onClick={exportAsJson}
        >Export JSON Data</button>

        <input className='import' type="file" accept=".json" onChange={importFromJson} />

        {isValidAmount && isConnectedToProvider && (


          <button className='addButton'
            onClick={() => {
              const newNode = {
                id: `abc`,
                type: 'default',
                data: {
                  label: (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span >Amount = ${amount ? amount.toFixed(2) : '0.00'}</span>
                    </div>
                  ),
                },
                position: { x: Math.random() * 250 + 300, y: Math.random() * 250 },
              };
              setNodes((nds) => [...nds, newNode]);

            }} >

            Add Node +
          </button>
        )}

      </header>

      {error && (
        <div className='error-msg'
        >
          {error}
        </div>
      )}

      <div style={{ flexGrow: 1, width: '100%', position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          deleteKeyCode={46}
          fitView
        >
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Alert, Button, Avatar, message, Select } from 'antd';
import { ethers, Wallet, JsonRpcProvider } from "ethers";
import blockies from 'ethereum-blockies';
import * as bip39 from "bip39";
import IconButton from './libs/IconButton';
import { FaGear } from "react-icons/fa6";
import { CopyFilled, DislikeOutlined, QrcodeOutlined, ReloadOutlined, RetweetOutlined } from '@ant-design/icons';
import axios from 'axios';
import { MultiChainWalletScanner } from './libs/scanner';
import { TokenBalance } from './libs/types';
import { TESTNETS, MAINNETS } from './libs/constants';


import { ReactComponent as IconETH } from './img/Network.svg';

import './css/homeBalance.css';

const { Title, Text } = Typography;

// WebSocket провайдер для подключения к сети Ethereum (Sepolia)
// const provider = new WebSocketProvider("wss://ethereum-sepolia-rpc.publicnode.com");
// const provider = new WebSocketProvider("wss://bsc-testnet-rpc.publicnode.com");
// const provider = new WebSocketProvider("https://data-seed-prebsc-1-s1.bnbchain.org:8545");

const WalletInfo: React.FC = () => {
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [ShortAddress, setShortAddress] = useState<string | null>(null);
  const [balanceETH, setBalanceETH] = useState<string | null>(null);
  const [balanceUSD, setBalanceUSD] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [provider, setProvider] = useState<JsonRpcProvider | null>(null);
  const [activeTab, setActiveTab] = useState('tokens');
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [totalBalanceUSD, setTotalBalanceUSD] = useState<string>('0.00');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('all');
  const [isTestnet, setIsTestnet] = useState<boolean>(false);

  const navigate = useNavigate();

  const textStyles = {
    color: 'rgba(255, 255, 255)',
  }

  // Функция для получения приватного ключа из мнемонической фразы
  async function getPrivateKeyFromMnemonic(mnemonic: string) {
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error("Invalid mnemonic phrase");
    }

    const wallet = Wallet.fromPhrase(mnemonic);
    return wallet.privateKey;
  }

  // Функция для получения адреса из приватного ключа
  async function getAddressFromPrivateKey(privateKey: string) {
    const wallet = new Wallet(privateKey);
    setAddress(wallet.address);
    return wallet.address;
  }

  async function shortenAddress(address: string, startLength = 6, endLength = 4): Promise<string> {
    if (address.length <= startLength + endLength) {
      return address; // Если длина адреса меньше или равна необходимй длине, вернуть его без изменений
    }
    return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
  }

  async function getAvatarFromAddress(address: string): Promise<string> {
    let avatarUrl = "";

    // Генерация аватарки и проверка длины ссылки
    while (avatarUrl.length < 240) {
      const avatar = blockies.create({ seed: address, size: 8, scale: 5 }); // Настройки аватара
      avatarUrl = avatar.toDataURL(); // Преобразовани Canvas в Data URL

      // console.log("Generated avatar URL:", avatarUrl);
    }

    return avatarUrl;
  }


  // Функция для получения и установки провайдера из localStorage
  const setUserProviderFromLocalStorage = () => {
    const storedProvider = localStorage.getItem('userProvider');
    const defaultProvider = "wss://ethereum-sepolia-rpc.publicnode.com"; // Sepolia по умолчанию
    const providerUrl = storedProvider || defaultProvider;
    const newProvider = new JsonRpcProvider(providerUrl);
    setProvider(newProvider);
  };

  // Получение цены ETH
  async function getETHPrice() {
    try {
      const response = await axios.get('https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD');
      return response.data.USD;
    } catch (error) {
      console.error("Ошибка при получении курса ETH:", error);
      return 0;
    }
  }

  // Функция для проверки баланса ETH
  async function checkBalance() {
    setLoading(true);
    try {
      if (!mnemonic) {
        throw new Error("Мнемоническая фраза не найдена");
      }

      const scanner = new MultiChainWalletScanner(
        Wallet.fromPhrase(mnemonic).privateKey
      );

      const enrichedTokens = await scanner.getEnrichedTokenBalances();
      setTokens(enrichedTokens);

      // Подсчет общего баланса в USD
      const totalUSD = enrichedTokens.reduce((sum, token) => {
        const balance = parseFloat(token.balance as string);
        return sum + (token.price || 0) * balance;
      }, 0);

      setTotalBalanceUSD(totalUSD.toFixed(2));
    } catch (error) {
      console.error("Ошибка при проверке баланса:", error);
    } finally {
      setLoading(false);
    }
  }

  // Функция для копирования адреса
  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(address);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  }

  async function getMnemonic() {
    const mnemonic = localStorage.getItem('walletMnemonic');
    if (mnemonic) {
      setMnemonic(mnemonic);
    }
  }

  // mnemonic
  useEffect(() => {
    // Получаем мнемоническую фразу из localStorage при монтировании компонента
    const storedMnemonic = localStorage.getItem('walletMnemonic');
    if (storedMnemonic) {
      setMnemonic(storedMnemonic);
    }
  }, []);

  // Функция для рендера контента в зависимости от выбранной вкладки
  const renderContent = () => {
    switch (activeTab) {
      case 'tokens':
        return (
          <>
            <div className="network-selector">
              <Select
                value={selectedNetwork}
                onChange={setSelectedNetwork}
                style={{ width: 200, marginBottom: '1em' }}
                defaultValue="all"
              >
                <Select.Option value="all">All Networks</Select.Option>
                {Object.entries(getCurrentNetworks()).map(([key, network]) => (
                  <Select.Option key={key} value={key}>
                    {network.name}
                  </Select.Option>
                ))}
              </Select>
            </div>
            <div className="sectionTokens-home">
              {getFilteredTokens().map((token, index) => (
                <div key={`${token.network}-${token.address}-${index}`} className="token">
                  <div className="IconName-home">
                    <div className="token-image">
                      {token.imageUrl && <img src={token.imageUrl} alt={token.name} className="token-icon" />}
                      {token.address !== 'native' && (
                        <img
                          className="networkIcon-home"
                          src={token.networkImageUrl}
                          alt={token.networkName}
                        />
                      )}
                    </div>
                    <div className="token-details">
                      <span className="token-name">{token.name}</span>
                      <div className="network-info">
                        {/* {token.networkImageUrl && (
                          <img
                            src={token.networkImageUrl}
                            alt={token.networkName}
                            className="network-badge-icon"
                          />
                        )}
                        <span className="network-name">{token.networkName}</span> */}
                      </div>
                    </div>
                  </div>
                  <div className="token-info">
                    <span className="tokenBalance-home">
                      {parseFloat(token.balance).toFixed(4)} {token.symbol}
                    </span>
                    <span className="tokenPrice-home">
                      ${((token.price || 0) * parseFloat(token.balance)).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        );
      case 'nfts':
        return <div className="sectionTokens-home">Content for NFT's</div>;
      case 'history':
        return <div className="sectionTokens-home">Transaction History</div>;
      default:
        return <div className="sectionTokens-home">Soon...</div>;
    }
  };


  // privateKey
  useEffect(() => {
    if (mnemonic) {
      getPrivateKeyFromMnemonic(mnemonic)
        .then(privateKey => {
          // Сохраням приватный ключ в localStorage
          localStorage.setItem('walletPrivateKey', privateKey);

          // Устанавливаем адрес (или приватный ключ) в состояние компонента
          setPrivateKey(privateKey);
        })
        .catch(error => {
          console.error("Error getting private key:", error);
        });
    }
  }, [mnemonic]);

  useEffect(() => {
    // Установка провайдера при монтировании компонента
    setUserProviderFromLocalStorage();
  }, []);

  // balance
  useEffect(() => {
    if (mnemonic) {
      checkBalance();
    }
  }, [mnemonic]);

  // address
  useEffect(() => {
    if (privateKey) {
      getAddressFromPrivateKey(privateKey).then(address => {
        setAddress(address)
        localStorage.setItem('walletAddress', address);
      });
    }
  }, [privateKey]);

  // short addres
  useEffect(() => {
    if (address) {
      shortenAddress(address).then(ShortAddress => setShortAddress(ShortAddress));
    }
  }, [address]);


  // avatar
  useEffect(() => {
    // Попытка получить аватарку из localStorage при загрузке страницы

    const savedAvatar = localStorage.getItem('walletAvatar');
    if (savedAvatar && savedAvatar && savedAvatar.length > 240) {
      setAvatarImage(savedAvatar);
    } else if (address) {
      console.log("ahuets")
      // Если аватарки в localStorage нет, генерируем новую
      getAvatarFromAddress(address).then(avatarUrl => {
        localStorage.setItem('walletAvatar', avatarUrl); // Сохраняем аватар в localStorage
        setAvatarImage(avatarUrl); // Обновляем состояние компонента
      });
    }
  }, [address]);

  useEffect(() => {
    message.config({
      getContainer: () => document.querySelector('.message-container') || document.body,
    });
  }, []);

  useEffect(() => {
    const storedIsTestnet = localStorage.getItem('isTestnet') === 'true';
    setIsTestnet(storedIsTestnet);
  }, []);

  // Получение текущих сетей в зависимости от режима (mainnet/testnet)
  const getCurrentNetworks = () => {
    return isTestnet ? TESTNETS : MAINNETS;
  };

  // Фильтрация токенов по выбранной сети
  const getFilteredTokens = () => {
    if (selectedNetwork === 'all') {
      return tokens;
    }
    return tokens.filter(token => token.network === selectedNetwork);
  };

  // Подсчет общего баланса для отфиьтрованных токенов
  useEffect(() => {
    const filteredTokens = getFilteredTokens();
    const total = filteredTokens.reduce((sum, token) => {
      const balance = parseFloat(token.balance);
      const price = token.price || 0;
      return sum + (balance * price);
    }, 0);
    setTotalBalanceUSD(total.toFixed(2));
  }, [tokens, selectedNetwork]);

  const SettingsButton = () => {
    navigate('/settings')
  }

  const QrButton = () => {
    navigate('/QrCode')
  }

  return (
    <div className='container'>

      <header className='header'>
        <button className='shortAddress-button defaultButton' onClick={copyToClipboard}> <CopyFilled className='copy-icon' twoToneColor={'pink'} /> {ShortAddress}</button>


        <IconButton
          icon={FaGear}
          onClick={SettingsButton}
          color="pink"
          size={24}
          className='settings-icon'
        />
      </header>



      <div className='body'>
        <div className="content">
          <div className="message-container"></div>

          <div className="column-home">
            <div className="info-home">
              <div className="important-home">
                {avatarImage && <img className='avatar' src={avatarImage} alt="Avatar" />}


                <span className='balance-home'>${totalBalanceUSD}</span>


                <Button
                  type="default"
                  onClick={checkBalance}
                  loading={loading}
                  variant='filled'
                  className='checkBalanceButton-home button-home'
                  icon={<ReloadOutlined />}
                ></Button>
              </div>

              <div className="buttonNav-home">
                <Button
                  type='default'
                  size='large'
                  onClick={QrButton}
                  className='qrButton-home button-home'
                  icon={<DislikeOutlined />}>
                </Button>
                <Button
                  type='default'
                  size='large'
                  onClick={QrButton}
                  className='qrButton-home button-home'
                  icon={<QrcodeOutlined />}>
                </Button>
                <Button
                  type='default'
                  size='large'
                  onClick={QrButton}
                  className='qrButton-home button-home'
                  icon={<RetweetOutlined />}>
                  Swap</Button>
              </div>
            </div>
            <div className="sectionBalance-home">

              <Button className='balanceButton-home'
                onClick={() => setActiveTab('tokens')}
              >TOKENS</Button>
              <Button className='balanceButton-home'
                onClick={() => setActiveTab('nfts')}
              >NFT's</Button>
              <Button className='balanceButton-home'
                onClick={() => setActiveTab('history')}
              >History</Button>

            </div>


            {renderContent()}
            {/* <div className='sectionTokens-home'>
              {renderContent()}
            </div> */}

          </div>

        </div>
      </div>
    </div>
  );
};

export default WalletInfo;
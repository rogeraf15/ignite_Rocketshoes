import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      //procurar se o produto ja existe
      const productExists = cart.find(product => product.id === productId);

      //Pegar o stock do productId
      const { data } = await api.get(`stock?id=${productId}`);
      const stock: Stock = data[0];

      if(stock.amount === 0){
        throw new Error();
      }


      if(productExists) {
        // aumentar a quantidade do produto que existe e retornar os outros
        const productsUpdate = cart.map(product => {
          if(product.id === productId){
            if(product.amount + 1 > stock.amount){
              throw new Error('Quantidade solicitada fora de estoque');
            }
            return ({
              ...product,
              amount: product.amount + 1
            });
          }else{
            return product;
          }
        });


        setCart(productsUpdate);
        
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(productsUpdate));
      } else {
        const { data } = await api.get(`products?id=${productId}`);

        const newProduct: Product = {
          ...data[0],
          amount: 1
        };

        const carts: Product[] = [
          ...cart,
          newProduct
        ]

        setCart(carts);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(carts));
      }

    } catch(err) {
      err 
        ? toast.error(err.message) 
        : toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.find(product => product.id === productId);

      if(productExists){
        //pegar todos os products menos ele
        const productsWithoutProductId = cart.filter(product =>  product.id !== productId );


        localStorage.setItem('@RocketShoes:cart', JSON.stringify(productsWithoutProductId));

        setCart(productsWithoutProductId);
      }else{
        throw new Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const productExists = cart.find(product => product.id === productId);

      const { data } = await api.get(`stock?id=${productId}`);
      const stock: Stock = data[0];

      if(productExists){
        const productsUpdated = cart.map(product => {
          if(product.id === productId){
            if(amount > stock.amount){
              throw toast.error('Quantidade solicitada fora de estoque');
            }
            return ({
              ...product,
              amount
            });
          }else{
            return product;
          }
        });

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(productsUpdated));

        setCart(productsUpdated);
      }else {
        throw new Error();
      }
    } catch(err) {
      err
        ? toast.error(err.message)
        : toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}

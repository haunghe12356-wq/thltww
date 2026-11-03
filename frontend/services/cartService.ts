"use client";

import { useSyncExternalStore } from "react";
import type { Product } from "./productService";

export type CartItem = {
  product: Product;
  quantity: number;
};

const CART_KEY = "vietnghe_cart";
const CART_EVENT = "vietnghe-cart-change";

function readCart(): CartItem[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(CART_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter(isCartItem);
  } catch {
    return [];
  }
}

function isCartItem(value: unknown): value is CartItem {
  if (value === null || typeof value !== "object" || !("product" in value) || !("quantity" in value)) {
    return false;
  }

  const { product, quantity } = value;
  return (
    product !== null &&
    typeof product === "object" &&
    "id" in product &&
    typeof product.id === "number" &&
    "name" in product &&
    typeof product.name === "string" &&
    "price" in product &&
    (typeof product.price === "number" || typeof product.price === "string") &&
    "stock" in product &&
    typeof product.stock === "number" &&
    typeof quantity === "number" &&
    Number.isInteger(quantity) &&
    quantity > 0
  );
}

function saveCart(items: CartItem[]) {
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(CART_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CART_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot() {
  return window.localStorage.getItem(CART_KEY) ?? "[]";
}

export function useCart() {
  const serializedCart = useSyncExternalStore(subscribe, getSnapshot, () => "[]");
  let items: CartItem[];
  try {
    const parsed: unknown = JSON.parse(serializedCart);
    items = Array.isArray(parsed) ? parsed.filter(isCartItem) : [];
  } catch {
    items = [];
  }

  return {
    items,
    count: items.reduce((total, item) => total + item.quantity, 0),
  };
}

export function addToCart(product: Product, quantity = 1) {
  if (product.stock < 1 || quantity < 1) return;
  const items = readCart();
  const existing = items.find((item) => item.product.id === product.id);
  if (existing) {
    existing.quantity = Math.min(existing.quantity + quantity, product.stock);
  } else if (product.stock > 0) {
    items.push({ product, quantity: Math.min(quantity, product.stock) });
  }
  saveCart(items);
}

export function updateCartQuantity(productId: number, quantity: number) {
  const items = readCart()
    .map((item) =>
      item.product.id === productId
        ? { ...item, quantity: Math.min(quantity, item.product.stock) }
        : item,
    )
    .filter((item) => item.quantity > 0);
  saveCart(items);
}

export function removeFromCart(productId: number) {
  saveCart(readCart().filter((item) => item.product.id !== productId));
}

export function clearCart() {
  saveCart([]);
}

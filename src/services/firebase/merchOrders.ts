import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

export interface OrderItem {
    productId: string;
    productName: string;
    price: number;
    quantity: number;
    size?: string;
    category: string;
}

export interface OrderData {
    orderId: string;
    userId: string;
    orbitId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    collegeName: string;
    items: OrderItem[];
    subtotal: number;
    deliveryCharge: number;
    totalAmount: number;
    deliveryMethod: 'pickup' | 'delivery';
    deliveryAddress?: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        pincode: string;
    };
    orderStatus: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    paymentStatus: 'pending' | 'completed' | 'failed';
    createdAt: any;
    updatedAt: any;
}

export const createOrder = async (orderData: Omit<OrderData, 'createdAt' | 'updatedAt'>): Promise<string> => {
    try {
        const docRef = await addDoc(collection(db, 'merchOrders'), {
            ...orderData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error: any) {
        console.error('Error creating order:', error);
        throw new Error(error.message || 'Failed to create order');
    }
};

export const generateOrderId = (): string => {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 7);
    return `ORD-${timestamp}-${randomPart}`.toUpperCase();
};

// Delivery charge for non-college students
export const DELIVERY_CHARGE = 100; // ₹100

// College name to check against
export const COLLEGE_NAME = 'Zeal College of Engineering and Research';

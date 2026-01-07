import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../toast/Toast';
import { ADMIN_PERMISSIONS } from '../../types/user';
import { SelectDropdown } from '../ui';
import Footer from '../layout/Footer';
import * as XLSX from 'xlsx';
import './MerchOrdersManager.css';

interface Order {
    id: string;
    orderId: string;
    orbitId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    collegeName: string;
    items: any[];
    subtotal: number;
    deliveryCharge: number;
    totalAmount: number;
    deliveryMethod: 'pickup' | 'delivery';
    deliveryAddress?: any;
    orderStatus: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    paymentStatus: 'pending' | 'completed' | 'failed';
    createdAt: any;
    updatedAt: any;
}

export default function MerchOrdersManager() {
    const navigate = useNavigate();
    const { isAdmin, hasPermission } = useAuth();
    const { showToast } = useToast();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('all');

    // Check permission
    const canManageOrders = isAdmin && hasPermission(ADMIN_PERMISSIONS.MANAGE_MERCH_ORDERS);

    useEffect(() => {
        if (!canManageOrders) {
            navigate('/user-dashboard');
            return;
        }

        const q = query(
            collection(db, 'merchOrders'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const ords = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Order[];
            setOrders(ords);
            setIsLoading(false);
        }, (error) => {
            console.error('Error fetching orders:', error);
            showToast('Failed to load orders', 'error');
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [canManageOrders, navigate, showToast]);

    const updateOrderStatus = async (orderId: string, status: Order['orderStatus']) => {
        try {
            await updateDoc(doc(db, 'merchOrders', orderId), {
                orderStatus: status,
                updatedAt: new Date().toISOString()
            });
            showToast(`Order status updated to ${status}`, 'success');
        } catch (error) {
            console.error('Error updating order status:', error);
            showToast('Failed to update order status', 'error');
        }
    };

    const updatePaymentStatus = async (orderId: string, status: Order['paymentStatus']) => {
        try {
            await updateDoc(doc(db, 'merchOrders', orderId), {
                paymentStatus: status,
                updatedAt: new Date().toISOString()
            });
            showToast(`Payment status updated to ${status}`, 'success');
        } catch (error) {
            console.error('Error updating payment status:', error);
            showToast('Failed to update payment status', 'error');
        }
    };

    const deleteOrder = async (orderId: string) => {
        if (!confirm('Are you sure you want to delete this order?')) return;
        try {
            await deleteDoc(doc(db, 'merchOrders', orderId));
            showToast('Order deleted', 'success');
            setSelectedOrder(null);
        } catch (error) {
            console.error('Error deleting order:', error);
            showToast('Failed to delete order', 'error');
        }
    };

    const filteredOrders = orders.filter(order =>
        filterStatus === 'all' || order.orderStatus === filterStatus
    );

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const exportToExcel = () => {
        const dataToExport = filteredOrders.map((order, index) => ({
            'Sr. No.': index + 1,
            'Order ID': order.orderId,
            'Orbit ID': order.orbitId,
            'Customer': order.customerName,
            'Email': order.customerEmail,
            'Phone': order.customerPhone,
            'College': order.collegeName,
            'Items': order.items.map(i => `${i.productName} (x${i.quantity})`).join(', '),
            'Subtotal': order.subtotal,
            'Delivery': order.deliveryCharge,
            'Total': order.totalAmount,
            'Method': order.deliveryMethod,
            'Address': order.deliveryAddress ? `${order.deliveryAddress.line1}, ${order.deliveryAddress.city}` : 'N/A',
            'Order Status': order.orderStatus,
            'Payment Status': order.paymentStatus,
            'Ordered At': formatDate(order.createdAt)
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');

        const date = new Date().toISOString().split('T')[0];
        const filename = `OrbitX_Merch_Orders_${date}.xlsx`;

        XLSX.writeFile(workbook, filename);
        showToast(`Exported ${filteredOrders.length} orders`, 'success');
    };

    if (!canManageOrders) return null;

    return (
        <>
            <main className="orders-manager">
                <header className="manager-header">
                    <h1>Merch Orders</h1>
                    <p>Track and manage merchandise orders and deliveries</p>
                </header>

                <section className="manager-toolbar">
                    <div className="manager-stats">
                        <span className="stat"><strong>{orders.length}</strong> Total</span>
                        <span className="stat stat--pending"><strong>{orders.filter(o => o.orderStatus === 'pending').length}</strong> Pending</span>
                        <span className="stat stat--shipped"><strong>{orders.filter(o => o.orderStatus === 'shipped').length}</strong> Shipped</span>
                    </div>
                    <div className="manager-actions">
                        <SelectDropdown
                            value={filterStatus}
                            onChange={setFilterStatus}
                            options={[
                                { value: 'all', label: 'All Status' },
                                { value: 'pending', label: 'Pending' },
                                { value: 'confirmed', label: 'Confirmed' },
                                { value: 'processing', label: 'Processing' },
                                { value: 'shipped', label: 'Shipped' },
                                { value: 'delivered', label: 'Delivered' },
                                { value: 'cancelled', label: 'Cancelled' }
                            ]}
                        />
                        <button className="export-btn" onClick={exportToExcel} disabled={filteredOrders.length === 0}>
                            Export Excel
                        </button>
                    </div>
                </section>

                <section className="manager-content">
                    {isLoading ? (
                        <div className="manager-loading">Loading orders...</div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="manager-empty">No orders found</div>
                    ) : (
                        <div className="orders-list">
                            {filteredOrders.map(order => (
                                <div
                                    key={order.id}
                                    className={`order-card ${selectedOrder?.id === order.id ? 'active' : ''}`}
                                    onClick={() => setSelectedOrder(order)}
                                >
                                    <div className="order-card__header">
                                        <span className="order-id">{order.orderId}</span>
                                        <span className={`order-status status--${order.orderStatus}`}>{order.orderStatus}</span>
                                    </div>
                                    <div className="order-card__body">
                                        <h3 className="customer-name">{order.customerName}</h3>
                                        <p className="order-total">₹{order.totalAmount} • {order.items.length} items</p>
                                        <p className="order-date">{formatDate(order.createdAt)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {selectedOrder && (
                        <div className="order-detail">
                            <div className="detail-header">
                                <h2>Order Details</h2>
                                <button className="close-detail" onClick={() => setSelectedOrder(null)}>×</button>
                            </div>

                            <div className="detail-body">
                                <div className="detail-section">
                                    <h3>Customer Info</h3>
                                    <p><strong>Name:</strong> {selectedOrder.customerName}</p>
                                    <p><strong>Orbit ID:</strong> {selectedOrder.orbitId}</p>
                                    <p><strong>Email:</strong> {selectedOrder.customerEmail}</p>
                                    <p><strong>Phone:</strong> {selectedOrder.customerPhone}</p>
                                    <p><strong>College:</strong> {selectedOrder.collegeName}</p>
                                </div>

                                <div className="detail-section">
                                    <h3>Delivery Infomation</h3>
                                    <p><strong>Method:</strong> {selectedOrder.deliveryMethod === 'pickup' ? 'Self Pickup (ZEAL)' : 'Home Delivery'}</p>
                                    {selectedOrder.deliveryMethod === 'delivery' && selectedOrder.deliveryAddress && (
                                        <p><strong>Address:</strong><br />
                                            {selectedOrder.deliveryAddress.line1}, {selectedOrder.deliveryAddress.line2 && `${selectedOrder.deliveryAddress.line2}, `}
                                            {selectedOrder.deliveryAddress.city}, {selectedOrder.deliveryAddress.state} - {selectedOrder.deliveryAddress.pincode}
                                        </p>
                                    )}
                                </div>

                                <div className="detail-section">
                                    <h3>Order Items</h3>
                                    <div className="order-items">
                                        {selectedOrder.items.map((item, i) => (
                                            <div key={i} className="order-item">
                                                <span>{item.productName} {item.size && `(${item.size})`} x {item.quantity}</span>
                                                <span>₹{item.price * item.quantity}</span>
                                            </div>
                                        ))}
                                        <div className="order-summary">
                                            <div className="summary-row"><span>Subtotal</span><span>₹{selectedOrder.subtotal}</span></div>
                                            <div className="summary-row"><span>Delivery</span><span>₹{selectedOrder.deliveryCharge}</span></div>
                                            <div className="summary-row total"><span>Total</span><span>₹{selectedOrder.totalAmount}</span></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="detail-section">
                                    <h3>Quick Actions</h3>
                                    <div className="action-groups">
                                        <div className="action-group">
                                            <label>Order Status</label>
                                            <div className="btn-group">
                                                <button onClick={() => updateOrderStatus(selectedOrder.id, 'confirmed')}>Confirm</button>
                                                <button onClick={() => updateOrderStatus(selectedOrder.id, 'processing')}>Process</button>
                                                <button onClick={() => updateOrderStatus(selectedOrder.id, 'shipped')}>Ship</button>
                                                <button onClick={() => updateOrderStatus(selectedOrder.id, 'delivered')}>Deliver</button>
                                                <button className="btn-cancel" onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled')}>Cancel</button>
                                            </div>
                                        </div>
                                        <div className="action-group">
                                            <label>Payment Status</label>
                                            <div className="btn-group">
                                                <button onClick={() => updatePaymentStatus(selectedOrder.id, 'completed')}>Paid</button>
                                                <button className="btn-failed" onClick={() => updatePaymentStatus(selectedOrder.id, 'failed')}>Failed</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button className="btn-delete-order" onClick={() => deleteOrder(selectedOrder.id)}>Delete Order</button>
                            </div>
                        </div>
                    )}
                </section>
            </main>
            <Footer />
        </>
    );
}

"""
Order State Machine - Defines allowed status transitions
"""
from .order_status import OrderStatus


ALLOWED_TRANSITIONS = {
    OrderStatus.NEW: {OrderStatus.AWAITING_PAYMENT, OrderStatus.PROCESSING, OrderStatus.CANCELED},
    OrderStatus.AWAITING_PAYMENT: {OrderStatus.PAID, OrderStatus.CANCELED},
    OrderStatus.PAID: {OrderStatus.PROCESSING, OrderStatus.REFUNDED},
    OrderStatus.PROCESSING: {OrderStatus.SHIPPED, OrderStatus.CANCELED, OrderStatus.REFUNDED},
    OrderStatus.SHIPPED: {OrderStatus.DELIVERED},
    OrderStatus.DELIVERED: {OrderStatus.REFUNDED},
    OrderStatus.CANCELED: set(),  # Terminal state
    OrderStatus.REFUNDED: set(),  # Terminal state
}


def can_transition(from_status: OrderStatus, to_status: OrderStatus) -> bool:
    """Check if transition from one status to another is allowed"""
    return to_status in ALLOWED_TRANSITIONS.get(from_status, set())


def get_allowed_transitions(status: OrderStatus) -> set:
    """Get all allowed transitions from a status"""
    return ALLOWED_TRANSITIONS.get(status, set())


def is_terminal(status: OrderStatus) -> bool:
    """Check if status is terminal (no further transitions)"""
    return len(ALLOWED_TRANSITIONS.get(status, set())) == 0


def is_payable(status: OrderStatus) -> bool:
    """Check if order can be paid"""
    return status == OrderStatus.AWAITING_PAYMENT


def is_cancellable(status: OrderStatus) -> bool:
    """Check if order can be cancelled"""
    return OrderStatus.CANCELED in ALLOWED_TRANSITIONS.get(status, set())

import React, { useState } from "react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const plans = [
  { id: "monthly", label: "₹70 / Month", amount: 70 },
  { id: "half_yearly", label: "₹400 / 6 Months", amount: 400 },
  { id: "yearly", label: "₹800 / Year", amount: 800 },
];

export default function PaymentPage() {
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  const handlePayment = async () => {
    if (!selectedPlan) return;

    const res = await fetch("http://localhost:10000/payment/create-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(selectedPlan),
    });

    const data = await res.json();

    const options = {
      key: data.key,
      amount: data.amount * 100,
      currency: "INR",
      name: "SideNote",
      description: "Subscription",
      order_id: data.order_id,

      handler: async function (response: any) {
        const verifyRes = await fetch(
          "http://localhost:10000/payment/verify-payment",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          }
        );

        const verifyData = await verifyRes.json();

        if (verifyData.success) {
          alert("✅ Payment Success");
        } else {
          alert("❌ Verification Failed");
        }
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  return (
    <div style={{ textAlign: "center", padding: "40px" }}>
      <h1>Choose Subscription</h1>

      {plans.map((plan) => (
        <div
          key={plan.id}
          onClick={() => setSelectedPlan(plan)}
          style={{
            border:
              selectedPlan?.id === plan.id
                ? "2px solid blue"
                : "1px solid gray",
            padding: "20px",
            margin: "10px",
            cursor: "pointer",
          }}
        >
          {plan.label}
        </div>
      ))}

      <button onClick={handlePayment} disabled={!selectedPlan}>
        Pay Now
      </button>
    </div>
  );
}
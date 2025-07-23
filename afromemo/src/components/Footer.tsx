import React from "react";
export default function Footer() {
  return (
    <footer className="border-t border-gray-700 bg-gray-800 text-white py-2">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold mb-4">
              Afromémo |{" "}
              <span className="text-sm text-gray-300">
                Agenda d'événements culturels afro
              </span>
            </h3>
          </div>
          <div>info at afromemo.ch</div>
        </div>
      </div>
    </footer>
  );
}

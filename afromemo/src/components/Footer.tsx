import React from "react";
export default function Footer() {
  return (
    <footer className="rounded-t-md bg-afrm-orange-2 text-afrm-black-2 py-2">
      <div className="container mx-auto px-4 text-xs sm:text-sm lg:txt-lg">
        <div className="flex flex-col md:text-base md:flex-row justify-between items-center">
          <a className="font-medium" href="/agenda/charte-d-utilisation">
            Charte d'utilisation
          </a>

          <span className="text-xs sm:text-sm font-bold">
            Afromémo |{" "}
            <span className="text-xs sm:text-sm text-afrm-black-2/70">
              Agenda d'événements culturels afro
            </span>
          </span>

          <p className="font-medium">info at afromemo.ch</p>
        </div>
      </div>
    </footer>
  );
}

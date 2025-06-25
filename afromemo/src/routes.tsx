import PageAgendaForm from "./pages/PageAgendaForm";
import AgendaListView from "./pages/PageAgendaList";
import PageLogin from "./pages/PageLogin";
import PageAgendaItemDetailView from "./pages/PageAgendaItemDetailView";
import WithProtection from "./components/WithProtection";
import React from "react";
import MainLayout from "./layout/Main";

const ProtectedForm = WithProtection(PageAgendaForm);

const Routes = [
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        name: "AgendaList",
        path: "/",
        element: <AgendaListView />,
      },
      {
        name: "AgendaForm",
        path: "agenda/create",
        element: <ProtectedForm />,
      },
      {
        name: "AgendaForm",
        path: "agenda/:itemId/edit",
        element: <ProtectedForm />,
      },
      {
        name: "AgendaView",
        path: "agenda/:itemId",
        element: <PageAgendaItemDetailView />,
      },
      {
        name: "PageFakeDetail",
        path: "/newdetail",
        element: <PageAgendaItemDetailView />,
      },
    ],
  },
  {
    name: "PageLoginForm",
    path: "/login",
    element: <PageLogin />,
  },
];

export default Routes;

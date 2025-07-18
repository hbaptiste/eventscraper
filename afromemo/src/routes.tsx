import PageAgendaForm from "./pages/PageAgendaForm";
import AgendaListView from "./pages/PageAgendaList";
import PageLogin from "./pages/PageLogin";
import PageAgendaItemDetailView from "./pages/PageAgendaItemDetailView";
import WithProtection from "./components/WithProtection";
import React from "react";
import MainLayout from "./layout/Main";
import PageFormConfirmation from "./pages/PageFormConfirmation";
import PageAgendaPublicForm from "./pages/PagePublicAgendaForm";

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
        name: "PublicAgendaForm",
        path: "agenda/public/new",
        element: <PageAgendaForm />,
      },
      {
        name: "PublicAgendaFormEdit",
        path: "agenda/public/:tokenId/edit",
        element: <PageAgendaPublicForm />,
      },
      {
        name: "PublicFormConfirmation",
        path: "agenda/form-confirmation",
        element: <PageFormConfirmation />,
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

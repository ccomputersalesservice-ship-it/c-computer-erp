/* route key -> page component (same routes as the live ERP) */
import Dashboard from './Dashboard.jsx';
import Products from './Products.jsx';
import Purchase from './Purchase.jsx';
import Sales from './Sales.jsx';
import Stock from './Stock.jsx';
import Serial, { Scan } from './Serial.jsx';
import Customers from './Customers.jsx';
import Reports from './Reports.jsx';
import Audit from './Audit.jsx';
import Build from './Build.jsx';
import BuildRec from './BuildRec.jsx';
import Challan from './Challan.jsx';
import Replace from './Replace.jsx';
import Print from './Print.jsx';
import Users from './Users.jsx';
import Settings from './Settings.jsx';
import Service, { Crm } from './Service.jsx';
import Quotes, { Quote } from './Quotes.jsx';
import Cash from './Cash.jsx';
import Pcmp from './Pcmp.jsx';
import POSPage from './POS.jsx';
import Fixed from './Fixed.jsx';
import DbTest from './DbTest.jsx';
import Tasks from './Tasks.jsx';

export const PAGES = {
  dash: Dashboard, products: Products, purchase: Purchase, sales: Sales, stock: Stock, serial: Serial, customers: Customers, reports: Reports,
  audit: Audit, build: Build, brec: BuildRec, chal: Challan, replace: Replace, print: Print, users: Users, settings: Settings, scan: Scan,
  crm: Crm, service: Service, quotes: Quotes, quote: Quote, cash: Cash, pcmp: Pcmp, pos: POSPage, fixed: Fixed, dbtest: DbTest, tasks: Tasks
};

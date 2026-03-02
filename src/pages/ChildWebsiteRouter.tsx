import { useParams, Routes, Route } from 'react-router-dom';
import { ChildWebsiteProvider } from '@/contexts/ChildWebsiteContext';
import { ChildWebsiteLayout } from '@/components/child-website/ChildWebsiteLayout';
import {
  ChildHome,
  ChildAccounts,
  ChildPosts,
  ChildScamReports,
  ChildChat,
  ChildMyOrders,
  ChildCategories,
  ChildFree,
  ChildContact
} from '@/components/child-website/pages';

export default function ChildWebsiteRouter() {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) {
    return null;
  }

  return (
    <ChildWebsiteProvider slug={slug}>
      <ChildWebsiteLayout>
        <Routes>
          <Route path="/" element={<ChildHome />} />
          <Route path="/accounts" element={<ChildAccounts />} />
          <Route path="/posts" element={<ChildPosts />} />
          <Route path="/scam-reports" element={<ChildScamReports />} />
          <Route path="/chat" element={<ChildChat />} />
          <Route path="/my-orders" element={<ChildMyOrders />} />
          <Route path="/categories" element={<ChildCategories />} />
          <Route path="/free" element={<ChildFree />} />
          <Route path="/contact" element={<ChildContact />} />
        </Routes>
      </ChildWebsiteLayout>
    </ChildWebsiteProvider>
  );
}

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { apiUrl } from '../api';
import { 
  X, 
  Minus, 
  Square,
  User,
  LogOut,
  Newspaper,
  MessageSquare,
  Globe,
  BookOpen
} from 'lucide-react';

export type UserData = {
  _id: string;
  name: string;
  email: string;
  displayName?: string;
  mood?: string;
  customMood?: string;
  showHitCount?: boolean;
  hitCount?: number;
  interests?: {
    general?: string;
    music?: string;
    movies?: string;
  };
  friends?: any[];
};

export default function HomePage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'feed' | 'profile' | 'messages' | 'search' | 'blog' | 'guestbook' | 'events'>('feed');
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [friendRequests, setFriendRequests] = useState<{incoming: any[], sent: any[]}>({ incoming: [], sent: [] });
  const [featuredUser, setFeaturedUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('retro_token');
    if (!token) {
      navigate('/');
      return;
    }

    // Verify token and get user
    fetch(apiUrl('/api/users/me'), {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => {
      if (!res.ok) throw new Error('Not authorized');
      return res.json();
    })
    .then(data => {
      setUser(data);
      setIsLoading(false);
      fetchRequests();
      fetchFriends();
      fetchFeaturedUser();
    })
    .catch(() => {
      localStorage.removeItem('retro_token');
      navigate('/');
    });
  }, [navigate]);

  const fetchFeaturedUser = () => {
    fetch(apiUrl('/api/users/featured'), {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('retro_token')}` }
    }).then(res => res.json()).then(data => setFeaturedUser(data)).catch(console.error);
  };

  const fetchFriends = () => {
    fetch(apiUrl('/api/users/me/friends'), {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('retro_token')}` }
    }).then(res => res.json()).then(data => setUser(prev => prev ? {...prev, friends: data} : null)).catch(console.error);
  };

  const fetchRequests = () => {
    fetch(apiUrl('/api/friends/requests'), {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('retro_token')}` }
    }).then(res => res.json()).then(data => {
      if (data.incoming) setFriendRequests(data);
    }).catch(console.error);
  };

  // Poll for new friend requests every 15 seconds
  useEffect(() => {
    const interval = setInterval(fetchRequests, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRequestAction = async (requestId: string, action: 'accept' | 'deny') => {
    try {
      await fetch(apiUrl(`/api/friends/handle/${requestId}`), {
        method: 'PUT',
        headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${localStorage.getItem('retro_token')}`
        },
        body: JSON.stringify({ action })
      });
      fetchRequests();
      if (action === 'accept') {
        fetchFriends();
      }
    } catch(err) { console.error(err); }
  };

  const sendRequest = async (toUserId: string) => {
    try {
      const res = await fetch(apiUrl(`/api/friends/request/${toUserId}`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('retro_token')}` }
      });
      if (res.ok) alert('Friend request sent!');
      else alert('Could not send friend request.');
    } catch(err) { console.error(err); }
  };

  const handleLogout = () => {
    localStorage.removeItem('retro_token');
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="font-retro text-2xl text-white animate-pulse">LOADING NETWORK DATA...</span>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full h-screen overflow-hidden pointer-events-auto flex justify-center bg-blue-900"
        style={{
           backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 3.333l1.83 5.631h5.922l-4.79 3.481 1.83 5.631L20 14.595l-4.792 3.481 1.83-5.631-4.79-3.48h5.922L20 3.333z' fill='%23fbbf24' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")`,
        }}
      >
        <div className="w-full max-w-5xl bg-transparent h-full flex flex-col py-8 px-2">
          
          {/* Header */}
          <div className="flex items-end justify-between border-b-4 border-blue-600 pb-2 mb-4">
            <h1 className="font-retro text-6xl tracking-wider text-yellow-400 drop-shadow-[2px_2px_0px_#000] uppercase" style={{ WebkitTextStroke: '1px blue' }}>
              RetroNet
            </h1>
            <div className="flex gap-2 text-white font-bold text-sm bg-blue-800/80 px-2 py-1 border-2 border-black">
              <button onClick={() => setActiveTab('feed')} className="hover:text-yellow-400 hover:underline">[Home]</button>
              <button onClick={() => { setViewingUserId(null); setActiveTab('profile'); }} className="hover:text-yellow-400 hover:underline">[My Profile]</button>
              <button onClick={() => setActiveTab('messages')} className="hover:text-yellow-400 hover:underline">[Messages]</button>
              <button onClick={() => setActiveTab('search')} className="hover:text-yellow-400 hover:underline">[Search]</button>
              <button onClick={handleLogout} className="hover:text-yellow-400 hover:underline">[Logout]</button>
            </div>
          </div>

          {/* Main Content Area */}
          {activeTab === 'search' ? (
            <div className="flex-1 overflow-y-auto">
              <SearchView user={user!} onViewProfile={(id) => { setViewingUserId(id); setActiveTab('profile'); }} onAddFriend={sendRequest} />
            </div>
          ) : (
            <div className="flex gap-4 flex-1 min-h-0">
              
              {/* Left Column */}
            {activeTab !== 'profile' && (
              <div className="w-64 shrink-0 flex flex-col gap-4 overflow-y-auto">
                <div className="window-frame bg-retro-gray p-1 shadow-md">
                  <div className="bg-retro-blue text-white text-[10px] font-bold px-2 py-0.5">
                    Me
                  </div>
                  <div className="bg-white border-2 border-t-gray-800 border-l-gray-800 p-3 h-full">
                    <h3 className="font-bold text-sm mb-2">{user?.displayName || user?.name}</h3>
                    <div className="w-full aspect-square bg-gray-200 border-2 border-gray-400 flex items-center justify-center mb-2 overflow-hidden">
                      <img 
                        src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${user?.name}`} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-xs text-center font-bold mb-2">Status: Online</div>
                    <div className="bg-black text-[#0f0] p-2 text-xs h-24 overflow-y-auto font-mono text-center">
                      <p>Welcome to RetroNet! Chat, Share, Connect with friends!</p>
                      <p className="mt-2">- Today's Mood: {user?.mood === 'custom' ? user?.customMood : user?.mood}</p>
                      <p>- Check out the new features!</p>
                    </div>
                    
                    <div className="flex flex-col gap-1 mt-4 text-xs font-bold text-center">
                      <button className="text-blue-800 hover:underline">[My Photos]</button>
                      <button onClick={() => { setViewingUserId(user._id); setActiveTab('blog'); }} className="text-blue-800 hover:underline">[My Blog]</button>
                      <button onClick={() => { setViewingUserId(user._id); setActiveTab('guestbook'); }} className="text-blue-800 hover:underline">[My Guestbook]</button>
                      <button className="text-blue-800 hover:underline">[My Friends]</button>
                      <button onClick={() => { setViewingUserId(user._id); setActiveTab('events'); }} className="text-blue-800 hover:underline">[My Events]</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Middle Column (Feed / Profile) */}
            <div className="flex-1 flex flex-col gap-4 min-h-0 min-w-0">
              {activeTab === 'feed' && (
                <div className="window-frame bg-retro-gray p-1 shadow-md flex-1 flex flex-col min-h-0">
                  <div className="bg-retro-blue text-white text-[10px] font-bold px-2 py-0.5">
                    Bulletin Board
                  </div>
                  <div className="flex-1 bg-white border-2 border-t-gray-800 border-l-gray-800 p-2 overflow-y-auto min-h-0">
                    <FeedView user={user!} onViewProfile={(id) => { setViewingUserId(id); setActiveTab('profile'); }} />
                  </div>
                </div>
              )}
              {activeTab === 'profile' && <ProfileView user={user!} targetUserId={viewingUserId} onUpdate={setUser} onAddFriend={sendRequest} onViewProfile={(id) => { setViewingUserId(id); setActiveTab('profile'); }} onViewBlog={(id) => { setViewingUserId(id); setActiveTab('blog'); }} onViewGuestbook={(id) => { setViewingUserId(id); setActiveTab('guestbook'); }} onViewEvents={(id) => { setViewingUserId(id); setActiveTab('events'); }} />}
              {activeTab === 'messages' && (
                <div className="window-frame bg-retro-gray p-1 shadow-md flex-1 flex flex-col min-h-0">
                  <div className="bg-retro-blue text-white text-[10px] font-bold px-2 py-0.5">
                    Messages
                  </div>
                  <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
                    <MessagesView currentUser={user!} />
                  </div>
                </div>
              )}
              {activeTab === 'blog' && (
                <div className="window-frame bg-retro-gray p-1 shadow-md flex-1 flex flex-col min-h-0 z-10 w-full relative">
                  <div className="bg-retro-blue text-white text-[10px] font-bold px-2 py-0.5">
                    Blog Entries
                  </div>
                  <div className="flex-1 overflow-y-auto min-h-0">
                    <BlogView targetUserId={viewingUserId} currentUser={user!} />
                  </div>
                </div>
              )}
              {activeTab === 'guestbook' && (
                <div className="window-frame bg-retro-gray p-1 shadow-md flex-1 flex flex-col min-h-0 z-10 w-full relative">
                  <div className="bg-retro-blue text-white text-[10px] font-bold px-2 py-0.5">
                    Guestbook
                  </div>
                  <div className="flex-1 overflow-y-auto min-h-0">
                    <GuestbookView targetUserId={viewingUserId} currentUser={user!} />
                  </div>
                </div>
              )}
              {activeTab === 'events' && (
                <div className="window-frame bg-retro-gray p-1 shadow-md flex-1 flex flex-col min-h-0 z-10 w-full relative">
                  <div className="bg-retro-blue text-white text-[10px] font-bold px-2 py-0.5">
                    Events
                  </div>
                  <div className="flex-1 overflow-y-auto min-h-0">
                    <EventsView targetUserId={viewingUserId} currentUser={user!} />
                  </div>
                </div>
              )}
            </div>

            {/* Right Column */}
            {activeTab !== 'profile' && (
            <div className="w-64 shrink-0 flex flex-col gap-4 overflow-y-auto">
              <div className="window-frame bg-retro-gray p-1 shadow-md">
                <div className="bg-retro-blue text-white text-[10px] font-bold px-2 py-0.5">
                  Friend Requests
                </div>
                <div className="bg-white border-2 border-t-gray-800 border-l-gray-800 p-2 text-xs flex flex-col gap-2 min-h-[50px]">
                  {friendRequests.incoming.length === 0 ? (
                    <div className="text-gray-500 italic text-center p-2">None</div>
                  ) : (
                    <>
                      {friendRequests.incoming.map(req => (
                        <div key={req._id} className="border border-gray-400 p-2 bg-gray-100">
                          <strong>{req.fromName}</strong> wants to be friends.
                          <div className="flex gap-2 mt-2">
                             <button onClick={() => handleRequestAction(req._id, 'accept')} className="bg-green-600 text-white font-bold border-2 border-t-green-400 border-l-green-400 border-b-green-800 border-r-green-800 px-2 py-0.5 hover:bg-green-500">Accept</button>
                             <button onClick={() => handleRequestAction(req._id, 'deny')} className="bg-red-600 text-white font-bold border-2 border-t-red-400 border-l-red-400 border-b-red-800 border-r-red-800 px-2 py-0.5 hover:bg-red-500">Deny</button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              <div className="window-frame bg-retro-gray p-1 shadow-md">
                <div className="bg-retro-blue text-white text-[10px] font-bold px-2 py-0.5">
                  Featured Profile
                </div>
                <div className="bg-white border-2 border-t-gray-800 border-l-gray-800 p-3 flex flex-col items-center">
                  {featuredUser ? (
                    <>
                      <div className="w-24 h-24 border border-gray-400 bg-gray-200 mb-2 cursor-pointer" onClick={() => { setViewingUserId(featuredUser._id); setActiveTab('profile'); }}>
                        <img 
                          src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${featuredUser.name}`} 
                          alt="Featured" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button onClick={() => { setViewingUserId(featuredUser._id); setActiveTab('profile'); }} className="text-blue-800 text-xs font-bold hover:underline mb-1 w-full text-center truncate">{featuredUser.displayName || featuredUser.name}</button>
                      <button onClick={() => { setViewingUserId(featuredUser._id); setActiveTab('profile'); }} className="text-xs hover:underline">[View Profile]</button>
                    </>
                  ) : (
                    <div className="text-xs text-gray-500 italic">No featured profile yet.</div>
                  )}
                </div>
              </div>
            </div>
            )}

          </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function BlogView({ targetUserId, currentUser }: { targetUserId: string | null, currentUser: UserData }) {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isWriting, setIsWriting] = useState(false);
  const userId = targetUserId || currentUser._id;
  const isMe = userId === currentUser._id;

  useEffect(() => {
    fetchBlogs();
  }, [userId]);

  const fetchBlogs = () => {
    const token = localStorage.getItem('retro_token');
    fetch(apiUrl(`/api/blogs/${userId}?t=${Date.now()}`), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setBlogs(data))
    .catch(console.error);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    
    const token = localStorage.getItem('retro_token');
    fetch(apiUrl('/api/blogs'), {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title: newTitle, content: newContent })
    })
    .then(res => {
      if (!res.ok) {
        return res.text().then(text => { throw new Error(text) });
      }
      return res.json();
    })
    .then((newBlog) => {
      setNewTitle('');
      setNewContent('');
      setIsWriting(false);
      setBlogs(prev => [newBlog, ...prev]);
    })
    .catch(err => {
      console.error(err);
      alert('Failed to post blog. Please try again.');
    });
  };

  return (
    <div className="bg-white border-2 border-t-gray-800 border-l-gray-800 min-h-0 flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
      {isMe && !isWriting && (
        <button onClick={() => setIsWriting(true)} className="retro-button w-full">Write a New Blog Entry</button>
      )}

      {isMe && isWriting && (
        <div className="border border-gray-400 p-2 bg-gray-100 flex flex-col gap-2">
          <input 
            type="text" 
            placeholder="Title..." 
            value={newTitle} 
            onChange={e => setNewTitle(e.target.value)}
            className="w-full px-2 py-1 border-2 border-t-gray-800 border-l-gray-800 border-b-white border-r-white text-xs font-bold"
          />
          <textarea 
            placeholder="What's on your mind...?"
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            className="w-full px-2 py-1 border-2 border-t-gray-800 border-l-gray-800 border-b-white border-r-white text-xs min-h-[100px]"
          />
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="retro-button flex-1 text-xs">Post Entry</button>
            <button onClick={() => setIsWriting(false)} className="retro-button flex-1 text-xs">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {blogs.length === 0 ? (
          <div className="text-center text-xs text-gray-500 italic p-4">No entries yet.</div>
        ) : (
          blogs.map(blog => (
            <div key={blog._id} className="border border-red-200 bg-orange-50 p-3">
              <h3 className="font-bold text-red-900 border-b border-red-200 mb-2 pb-1">{blog.title}</h3>
              <p className="text-xs text-gray-800 whitespace-pre-wrap">{blog.content}</p>
              <div className="text-[9px] text-gray-500 mt-2 text-right">
                Posted on: {new Date(blog.createdAt).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function GuestbookView({ targetUserId, currentUser }: { targetUserId: string | null, currentUser: UserData }) {
  const [entries, setEntries] = useState<any[]>([]);
  const [newContent, setNewContent] = useState('');
  const [isWriting, setIsWriting] = useState(false);
  const userId = targetUserId || currentUser._id;
  const isMe = userId === currentUser._id;

  useEffect(() => {
    fetchGuestbook();
  }, [userId]);

  const fetchGuestbook = () => {
    const token = localStorage.getItem('retro_token');
    fetch(apiUrl(`/api/guestbook/${userId}?t=${Date.now()}`), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setEntries(data))
    .catch(console.error);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    
    const token = localStorage.getItem('retro_token');
    fetch(apiUrl(`/api/guestbook/${userId}`), {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: newContent, authorName: currentUser.displayName || currentUser.name })
    })
    .then(res => {
      if (!res.ok) {
        return res.text().then(text => { throw new Error(text) });
      }
      return res.json();
    })
    .then((newEntry) => {
      setNewContent('');
      setIsWriting(false);
      setEntries(prev => [newEntry, ...prev]);
    })
    .catch(err => {
      console.error(err);
      alert('Failed to sign guestbook. Please try again.');
    });
  };

  return (
    <div className="bg-white border-2 border-t-gray-800 border-l-gray-800 min-h-0 flex-1 p-4 flex flex-col gap-4 overflow-y-auto w-full">
      {!isWriting ? (
        <button onClick={() => setIsWriting(true)} className="retro-button w-full">Sign Guestbook</button>
      ) : (
        <div className="border border-gray-400 p-2 bg-gray-100 flex flex-col gap-2">
          <textarea 
            placeholder="Write a message..."
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            className="w-full px-2 py-1 border-2 border-t-gray-800 border-l-gray-800 border-b-white border-r-white text-xs min-h-[100px]"
          />
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="retro-button flex-1 text-xs">Post Entry</button>
            <button onClick={() => setIsWriting(false)} className="retro-button flex-1 text-xs">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {entries.length === 0 ? (
          <div className="text-center text-xs text-gray-500 italic p-4">Nobody has signed this guestbook yet.</div>
        ) : (
          entries.map(entry => (
            <div key={entry._id} className="border border-blue-200 bg-blue-50 p-3">
              <div className="font-bold text-blue-900 border-b border-blue-200 mb-2 pb-1 flex justify-between items-end">
                <span>{entry.authorName} wrote:</span>
                <span className="text-[9px] font-normal tracking-tight">{new Date(entry.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-xs text-gray-800 whitespace-pre-wrap">{entry.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function EventsView({ targetUserId, currentUser }: { targetUserId: string | null, currentUser: UserData }) {
  const [events, setEvents] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [isWriting, setIsWriting] = useState(false);
  const userId = targetUserId || currentUser._id;
  const isMe = userId === currentUser._id;

  useEffect(() => {
    fetchEvents();
  }, [userId]);

  const fetchEvents = () => {
    const token = localStorage.getItem('retro_token');
    fetch(apiUrl(`/api/events/${userId}?t=${Date.now()}`), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setEvents(data))
    .catch(console.error);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate.trim()) return;
    
    const token = localStorage.getItem('retro_token');
    fetch(apiUrl(`/api/events/${userId}`), {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        title: newTitle, 
        description: newDescription,
        date: new Date(newDate).toISOString(),
        location: newLocation
      })
    })
    .then(res => {
      if (!res.ok) {
        return res.text().then(text => { throw new Error(text) });
      }
      return res.json();
    })
    .then((newEvent) => {
      setNewTitle('');
      setNewDescription('');
      setNewDate('');
      setNewLocation('');
      setIsWriting(false);
      setEvents(prev => [newEvent, ...prev]);
    })
    .catch(err => {
      console.error(err);
      alert('Failed to post event. Please try again.');
    });
  };

  return (
    <div className="bg-white border-2 border-t-gray-800 border-l-gray-800 min-h-0 flex-1 p-4 flex flex-col gap-4 overflow-y-auto w-full">
      {isMe && !isWriting && (
        <button onClick={() => setIsWriting(true)} className="retro-button w-full">Create a New Event</button>
      )}

      {isMe && isWriting && (
        <div className="border border-gray-400 p-2 bg-gray-100 flex flex-col gap-2">
          <input 
            type="text" 
            placeholder="Event Title..." 
            value={newTitle} 
            onChange={e => setNewTitle(e.target.value)}
            className="w-full px-2 py-1 border-2 border-t-gray-800 border-l-gray-800 border-b-white border-r-white text-xs font-bold"
          />
          <input 
            type="datetime-local" 
            value={newDate} 
            onChange={e => setNewDate(e.target.value)}
            className="w-full px-2 py-1 border-2 border-t-gray-800 border-l-gray-800 border-b-white border-r-white text-xs"
          />
          <input 
            type="text" 
            placeholder="Location..." 
            value={newLocation} 
            onChange={e => setNewLocation(e.target.value)}
            className="w-full px-2 py-1 border-2 border-t-gray-800 border-l-gray-800 border-b-white border-r-white text-xs"
          />
          <textarea 
            placeholder="Event Description..."
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
            className="w-full px-2 py-1 border-2 border-t-gray-800 border-l-gray-800 border-b-white border-r-white text-xs min-h-[60px]"
          />
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="retro-button flex-1 text-xs">Create Event</button>
            <button onClick={() => setIsWriting(false)} className="retro-button flex-1 text-xs">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {events.length === 0 ? (
          <div className="text-center text-xs text-gray-500 italic p-4">No events created yet.</div>
        ) : (
          events.map(event => (
            <div key={event._id} className="border border-green-200 bg-green-50 p-3">
              <h3 className="font-bold text-green-900 border-b border-green-200 mb-2 pb-1">{event.title}</h3>
              <div className="flex flex-col gap-1 text-xs text-gray-800 mb-2">
                <div><strong>When:</strong> {new Date(event.date).toLocaleString()}</div>
                {event.location && <div><strong>Where:</strong> {event.location}</div>}
              </div>
              <p className="text-xs text-gray-800 whitespace-pre-wrap">{event.description}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function FeedView({ user, onViewProfile }: { user: UserData, onViewProfile: (id: string) => void }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = () => {
    fetch(apiUrl('/api/posts'), {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('retro_token')}` }
    })
    .then(res => res.json())
    .then(data => setPosts(data))
    .catch(console.error);
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;
    setIsPosting(true);
    
    try {
      const res = await fetch(apiUrl('/api/posts'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('retro_token')}`
        },
        body: JSON.stringify({ content: newPostContent })
      });
      if (res.ok) {
        setNewPostContent('');
        fetchPosts();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="bg-retro-gray p-2 border-2 border-white border-b-gray-600 border-r-gray-600 shrink-0">
        <form onSubmit={handlePost} className="flex gap-2 items-center">
          <input 
            type="text" 
            className="flex-1 bg-white border-2 border-gray-400 p-1 text-sm outline-none"
            placeholder="What's on your mind?"
            value={newPostContent}
            onChange={e => setNewPostContent(e.target.value)}
            disabled={isPosting}
          />
          <button 
            type="submit" 
            disabled={isPosting || !newPostContent.trim()}
            className="bg-blue-800 text-white font-bold px-4 py-1 border-2 border-t-white border-l-white border-b-black border-r-black hover:bg-blue-700 disabled:opacity-50"
          >
            Post
          </button>
        </form>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {posts.map(post => (
          <div key={post._id} className="bg-retro-gray border-2 border-blue-600 p-1">
            <div className="bg-white border-2 border-t-gray-800 border-l-gray-800 p-2 flex gap-3">
              <div className="w-12 h-12 shrink-0 border border-t-gray-800 border-l-gray-800 bg-gray-200">
                 <img src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${post.authorName}`} alt="avatar" className="w-full h-full" />
              </div>
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="mb-1 text-sm">
                  <span className="font-bold cursor-pointer hover:underline text-blue-800" onClick={() => onViewProfile(post.authorPath)}>{post.authorName}</span> says:
                </div>
                <p className="text-xs break-words whitespace-pre-wrap italic">"{post.content}"</p>
                <div className="text-[10px] text-gray-500 mt-2">
                  - Posted: {new Date(post.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ))}
        {posts.length === 0 && (
          <div className="text-center text-sm font-bold text-gray-500 py-10">
            No posts found.
          </div>
        )}
      </div>
    </div>
  );
}

function MenuButton({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-1 text-xs text-left ${active ? 'bg-retro-blue text-white font-bold' : 'hover:bg-gray-300'}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ProfileView({ user, targetUserId, onUpdate, onAddFriend, onViewProfile, onViewBlog, onViewGuestbook, onViewEvents }: { user: UserData, targetUserId: string | null, onUpdate: (u: UserData) => void, onAddFriend: (id: string) => void, onViewProfile: (id: string) => void, onViewBlog: (id: string) => void, onViewGuestbook: (id: string) => void, onViewEvents: (id: string) => void }) {
  const [profileUser, setProfileUser] = useState<UserData | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [localHitCount, setLocalHitCount] = useState(targetUserId ? 0 : (user.hitCount || 0));

  // Edit states
  const [editForm, setEditForm] = useState({
    displayName: user.displayName || '',
    mood: user.mood || 'happy',
    customMood: user.customMood || '',
    interests: {
      general: user.interests?.general || '',
      music: user.interests?.music || '',
      movies: user.interests?.movies || ''
    },
    showHitCount: user.showHitCount ?? true
  });

  const isMe = !targetUserId || targetUserId === user._id;
  const displayUser = profileUser || user;

  const fetchGuestbook = (userId: string) => {
    fetch(apiUrl(`/api/guestbook/${userId}?t=${Date.now()}`), {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('retro_token')}` }
    })
    .then(res => res.json())
    .then(data => setComments(data))
    .catch(console.error);
  };

  useEffect(() => {
    if (targetUserId && targetUserId !== user._id) {
      fetch(apiUrl(`/api/users/${targetUserId}`), { headers: { 'Authorization': `Bearer ${localStorage.getItem('retro_token')}` }})
      .then(res => res.json())
      .then(data => {
         setProfileUser(data);
         setLocalHitCount(data.hitCount || 0);
         fetchGuestbook(targetUserId);
      })
      .catch(console.error);
    } else {
      setProfileUser(user);
      setLocalHitCount(user.hitCount || 0);
      fetchGuestbook(user._id);
    }
  }, [targetUserId, user]);

  useEffect(() => {
    if (isMe) {
      fetch(apiUrl('/api/users/me/hit'), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('retro_token')}` }
      })
      .then(res => res.json())
      .then(data => {
        setLocalHitCount(data.hitCount);
      })
      .catch(console.error);
    }
  }, [isMe]);

  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    fetch(apiUrl(`/api/guestbook/${displayUser._id}`), {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('retro_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: newComment, authorName: user.displayName || user.name })
    })
    .then(res => res.json())
    .then(newEntry => {
      if (newEntry.error) {
        alert(newEntry.error);
        return;
      }
      setComments([newEntry, ...comments]);
      setNewComment('');
    })
    .catch(err => {
      console.error(err);
      alert('Failed to post comment.');
    });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(apiUrl('/api/users/me'), {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('retro_token')}`
        },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        const updatedUser = await res.json();
        onUpdate(updatedUser);
        setIsEditing(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isEditing && isMe) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="window-frame bg-retro-gray p-1 shadow-md">
          <div className="bg-retro-blue text-white text-[10px] font-bold px-2 py-0.5 uppercase">
            Edit Profile.EXE
          </div>
          <div className="bg-white border-2 border-t-gray-800 border-l-gray-800 p-6">
            <h2 className="font-retro text-2xl text-retro-blue mb-4 border-b border-dashed border-gray-400 pb-2">Modify Your Identity</h2>
            <form onSubmit={handleSaveProfile} className="space-y-4 text-sm">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-xs uppercase">Username (Read Only)</label>
                <input type="text" className="retro-input bg-gray-200 text-gray-500 cursor-not-allowed" value={user.name} disabled />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-bold text-xs uppercase">Display Name</label>
                <input type="text" className="retro-input" value={editForm.displayName} onChange={e => setEditForm(prev => ({...prev, displayName: e.target.value}))} />
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1 flex flex-col gap-1">
                  <label className="font-bold text-xs uppercase">Mood</label>
                  <select className="retro-input" value={editForm.mood} onChange={e => setEditForm(prev => ({...prev, mood: e.target.value}))}>
                    <option value="happy">Happy</option>
                    <option value="sad">Sad</option>
                    <option value="coding">Coding</option>
                    <option value="custom">Custom...</option>
                  </select>
                </div>
                {editForm.mood === 'custom' && (
                  <div className="flex-1 flex flex-col gap-1">
                    <label className="font-bold text-xs uppercase">Custom Mood</label>
                    <input type="text" className="retro-input" value={editForm.customMood} onChange={e => setEditForm(prev => ({...prev, customMood: e.target.value}))} />
                  </div>
                )}
              </div>

              <div className="space-y-2 border-t border-dashed border-gray-300 pt-4">
                <h3 className="font-bold text-retro-pink uppercase text-xs mb-2">Interests & Hobbies</h3>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase">General Interests</label>
                  <textarea className="retro-input h-16 resize-none" value={editForm.interests.general} onChange={e => setEditForm(prev => ({...prev, interests: {...prev.interests, general: e.target.value}}))}></textarea>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase">Music</label>
                  <textarea className="retro-input h-16 resize-none" value={editForm.interests.music} onChange={e => setEditForm(prev => ({...prev, interests: {...prev.interests, music: e.target.value}}))}></textarea>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase">Movies</label>
                  <textarea className="retro-input h-16 resize-none" value={editForm.interests.movies} onChange={e => setEditForm(prev => ({...prev, interests: {...prev.interests, movies: e.target.value}}))}></textarea>
                </div>
              </div>

              <div className="space-y-2 border-t border-dashed border-gray-300 pt-4">
                <h3 className="font-bold text-retro-pink uppercase text-xs mb-2">Advanced Features</h3>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={editForm.showHitCount} onChange={e => setEditForm(prev => ({...prev, showHitCount: e.target.checked}))} className="w-4 h-4 cursor-pointer" />
                  Show Hit Count on profile page
                </label>
              </div>

              <div className="pt-4 flex gap-2">
                <button type="submit" className="retro-button bg-retro-teal text-white flex-1 hover:bg-teal-600">SAVE CHANGES</button>
                <button type="button" onClick={() => setIsEditing(false)} className="retro-button flex-1">CANCEL</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col md:flex-row gap-6 max-w-5xl mx-auto">
      {/* Left Column */}
      <div className="w-full md:w-64 shrink-0 flex flex-col gap-6">
        
        {/* Profile Picture Box */}
        <div className="window-frame bg-retro-gray p-1 shadow-md">
          <div className="bg-retro-blue text-white text-[10px] font-bold px-2 py-0.5 uppercase">
            {displayUser.name}'s Identity
          </div>
          <div className="bg-white border-2 border-t-gray-800 border-l-gray-800 p-3 flex flex-col items-center gap-3">
            <h3 className="font-retro text-2xl text-retro-pink uppercase text-center leading-none">
              Welcome to my spacee!
            </h3>
            <div className="w-32 h-32 bg-gray-200 border-2 border-gray-400 flex items-center justify-center shadow-inner overflow-hidden relative">
              <span className="text-gray-400 font-bold text-6xl select-none absolute">
                {displayUser.name.charAt(0).toUpperCase()}
              </span>
              <img 
                src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${displayUser.name}`} 
                alt="Profile" 
                className="w-full h-full object-cover z-10"
              />
            </div>
            {displayUser.mood && (
              <div className="bg-gray-100 ring-1 ring-gray-400 text-[10px] uppercase font-bold py-1 px-2 text-center w-full">
                Mood: {displayUser.mood === 'custom' ? displayUser.customMood : displayUser.mood}
              </div>
            )}
            {isMe && (
              <button onClick={() => setIsEditing(true)} className="text-retro-blue text-xs font-bold underline hover:text-retro-pink uppercase">
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Hit Count */}
        {(displayUser.showHitCount ?? true) && (
          <div className="window-frame bg-retro-gray p-1 shadow-md">
            <div className="bg-retro-blue text-white text-[10px] font-bold px-2 py-0.5 uppercase">
              Stats
            </div>
            <div className="bg-black text-[#0f0] font-retro text-2xl p-2 text-center border-2 border-t-gray-800 border-l-gray-800 shadow-inner tracking-widest flex items-center justify-center gap-2">
              <span className="text-[10px] uppercase text-gray-400 font-mono tracking-normal leading-none mt-1">HITS</span> {localHitCount.toString().padStart(6, '0')}
            </div>
          </div>
        )}

        {/* Actions Box */}
        <div className="window-frame bg-retro-gray p-1 shadow-md">
          <div className="bg-retro-blue text-white text-[10px] font-bold px-2 py-0.5 uppercase">
            Actions
          </div>
          <div className="bg-white border-2 border-t-gray-800 border-l-gray-800 p-2 flex flex-col gap-2">
            <button className="retro-button text-xs w-full justify-start text-left uppercase">
              <MessageSquare size={12} /> Send Message
            </button>
            {!isMe && (
              user.friends?.some((f: any) => f._id === displayUser._id) ? (
                <button className="retro-button text-xs w-full justify-start text-left uppercase text-gray-500 line-through" disabled>
                  <User size={12} /> Already Friends
                </button>
              ) : (
                <button onClick={() => onAddFriend(displayUser._id)} className="retro-button text-xs w-full justify-start text-left uppercase">
                  <User size={12} /> Add to Friends
                </button>
              )
            )}
            <button className="retro-button text-xs w-full justify-start text-left uppercase">
              <Globe size={12} /> Contact
            </button>
            <button onClick={() => onViewBlog(displayUser._id)} className="retro-button text-xs w-full justify-start text-left uppercase">
              <BookOpen size={12} /> View Blog
            </button>
            <button onClick={() => onViewGuestbook(displayUser._id)} className="retro-button text-xs w-full justify-start text-left uppercase">
              <BookOpen size={12} /> View Guestbook
            </button>
            <button onClick={() => onViewEvents(displayUser._id)} className="retro-button text-xs w-full justify-start text-left uppercase">
              <BookOpen size={12} /> View Events
            </button>
          </div>
        </div>

      </div>

      {/* Right Column */}
      <div className="flex-1 flex flex-col gap-6 min-w-0">
        
        <div className="flex flex-col xl:flex-row gap-6">
          {/* About Me Box */}
          <div className="flex-1 window-frame bg-retro-gray p-1 shadow-md">
            <div className="bg-retro-blue text-white text-[10px] font-bold px-2 py-0.5 uppercase">
              About Me
            </div>
            <div className="bg-white border-2 border-t-gray-800 border-l-gray-800 p-4 text-sm h-[200px] overflow-y-auto">
              <p className="mb-2"><strong>Name:</strong> {displayUser.displayName || displayUser.name}</p>
              <p className="mb-2"><strong>Email:</strong> {displayUser.email}</p>
              <p className="mb-2"><strong>Status:</strong> Online</p>
              
              {(displayUser.interests?.general || displayUser.interests?.music || displayUser.interests?.movies) && (
                <div className="mt-4 border-t border-dashed border-gray-300 pt-3 space-y-2">
                  {displayUser.interests.general && <p className="text-xs"><strong className="text-retro-pink">INTERESTS:</strong> {displayUser.interests.general}</p>}
                  {displayUser.interests.music && <p className="text-xs"><strong className="text-retro-pink">MUSIC:</strong> {displayUser.interests.music}</p>}
                  {displayUser.interests.movies && <p className="text-xs"><strong className="text-retro-pink">MOVIES:</strong> {displayUser.interests.movies}</p>}
                </div>
              )}
              
              {!displayUser.interests && (
                <p className="text-gray-600 mt-4 italic">
                  "Hello world! This is my retro space. Let's browse the web like it's 1999."
                </p>
              )}
            </div>
          </div>

          {/* Top 8 Friends Box */}
          <div className="xl:w-64 window-frame bg-retro-gray p-1 shadow-md shrink-0">
            <div className="bg-retro-blue text-white text-[10px] font-bold px-2 py-0.5 uppercase">
              Top 8 Friends
            </div>
            <div className="bg-white border-2 border-t-gray-800 border-l-gray-800 p-3 h-[200px] overflow-y-auto">
              <div className="grid grid-cols-4 gap-2 h-full">
                {displayUser.friends?.map((friend: any, i: number) => (
                  <div key={i} className="flex flex-col items-center gap-1 group cursor-pointer" onClick={() => onViewProfile(friend._id)}>
                    <div className="w-10 h-10 border border-gray-400 bg-gray-100 group-hover:border-retro-blue shadow-sm">
                      <img 
                        src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${friend.name}`} 
                        alt="friend" 
                        className="w-full h-full"
                      />
                    </div>
                    <span className="text-[8px] uppercase group-hover:text-retro-blue truncate w-full text-center">{friend.displayName || friend.name}</span>
                  </div>
                ))}
                {(!displayUser.friends || displayUser.friends.length === 0) && (
                   <span className="col-span-4 text-xs text-gray-500 italic text-center mt-4">No friends yet.</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Guest Book */}
        <div className="window-frame bg-retro-gray p-1 shadow-md">
          <div className="bg-retro-blue text-white text-[10px] font-bold px-2 py-0.5 uppercase">
            Guest Book
          </div>
          <div className="bg-white border-2 border-t-gray-800 border-l-gray-800 p-4">
            <form onSubmit={submitComment} className="flex flex-col gap-2 mb-4 border-b-2 border-dashed border-gray-300 pb-4">
              <label className="text-xs font-bold uppercase">Sign the guest book:</label>
              <textarea 
                className="retro-input w-full h-16 resize-none" 
                placeholder="Leave a message..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
              />
              <button className="retro-button self-end text-xs uppercase shadow-none ring-1 ring-black">Publish</button>
            </form>

            <div className="space-y-3">
              {comments.slice(0, 10).map((c, i) => (
                <div key={c._id || i} className="bg-gray-100 p-2 border border-gray-300 text-sm">
                  <div className="font-bold text-retro-blue text-xs uppercase mb-1">
                    {c.authorName || c.author} says:
                    {c.createdAt && <span className="text-[9px] font-normal tracking-tight float-right">{new Date(c.createdAt).toLocaleString()}</span>}
                  </div>
                  <div className="whitespace-pre-wrap">{c.content || c.text}</div>
                </div>
              ))}
              {comments.length === 0 && (
                <div className="text-gray-500 italic text-sm">No comments yet.</div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function PostCard({ author, time, content }: { author: string, time: string, content: string }) {
  return (
    <div className="window-frame bg-retro-gray p-1 shadow-md">
      <div className="bg-retro-blue text-white text-[10px] font-bold px-2 py-0.5 flex justify-between">
        <span>{author}</span>
        <span>{time}</span>
      </div>
      <div className="bg-white border-2 border-t-gray-800 border-l-gray-800 p-3 text-sm min-h-[60px]">
        {content}
      </div>
    </div>
  );
}

function MessagesView({ currentUser }: { currentUser: UserData }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    // 1. Establish Socket Connection
    const token = localStorage.getItem('retro_token');
    if (!token) return;

    // determine transport and URL
    const newSocket = io(import.meta.env.VITE_API_URL ?? '', {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      newSocket.emit('authenticate', token);
    });

    newSocket.on('newMessage', (message: any) => {
      setMessages(prev => {
        // Just checking if we're focused on this friend (or the message is to/from them)
        // If it's a new message in another thread, we might not want to add it to current view,
        // but since we only have one message buffer for simplicity:
        // Actually we SHOULD check if it belongs to current conversation
        return [...prev, message];
      });
    });

    newSocket.on('messageSent', (message: any) => {
      setMessages(prev => [...prev, message]);
    });

    setSocket(newSocket);

    // 2. Fetch Friends
    fetch(apiUrl('/api/users/me/friends'), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setFriends(data))
      .catch(console.error);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    // Re-fetch messages when selected friend changes
    if (selectedFriend) {
      const token = localStorage.getItem('retro_token');
      fetch(apiUrl(`/api/messages/${selectedFriend._id}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => setMessages(data))
      .catch(console.error);
    } else {
      setMessages([]);
    }
  }, [selectedFriend]);

  const handleSendMessage = () => {
    if (!socket || !selectedFriend || !newMessage.trim()) return;
    socket.emit('sendMessage', { recipientId: selectedFriend._id, content: newMessage.trim() });
    setNewMessage('');
  };

  return (
    <div className="flex bg-white h-full min-h-0 border-2 border-t-gray-800 border-l-gray-800">
      {/* Sidebar for Friends */}
      <div className="w-1/3 border-r-2 border-gray-400 bg-gray-100 flex flex-col">
        <div className="bg-gray-300 px-2 py-1 text-xs font-bold border-b-2 border-gray-400">Buddy List</div>
        <div className="flex-1 overflow-y-auto p-1 text-xs">
          {friends.length === 0 ? (
            <div className="text-gray-500 italic p-2 text-center">No friends yet.</div>
          ) : (
            friends.map(friend => (
              <div 
                key={friend._id}
                onClick={() => setSelectedFriend(friend)}
                className={`p-2 cursor-pointer mb-1 border select-none ${selectedFriend?._id === friend._id ? 'bg-blue-600 text-white border-blue-800' : 'bg-white border-gray-400 hover:bg-gray-200'} `}
              >
                <div className="font-bold">{friend.displayName || friend.name}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedFriend ? (
          <>
            <div className="bg-blue-100 px-3 py-2 border-b-2 border-blue-200 text-sm font-bold text-blue-900 border-b">
              Chatting with {selectedFriend.displayName || selectedFriend.name}
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              {messages.filter(m => (m.sender?._id === selectedFriend._id || m.receiver === selectedFriend._id) || (m.sender === selectedFriend._id)).map((msg, i) => {
                const isMine = msg.sender?._id === currentUser._id || msg.sender === currentUser._id;
                return (
                  <div key={msg._id || i} className={`w-full flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <small className="text-[9px] text-gray-500 mb-0.5">{isMine ? 'You' : (selectedFriend.displayName || selectedFriend.name)}</small>
                    <div className={`p-2 rounded-lg text-xs max-w-[80%] ${isMine ? 'bg-blue-600 text-white border border-blue-800' : 'bg-white border border-gray-400 text-black'}`}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-2 border-t-2 border-gray-400 bg-gray-200 flex gap-2">
              <input 
                type="text"
                className="flex-1 border-2 border-t-gray-800 border-l-gray-800 border-b-white border-r-white p-1 text-xs"
                placeholder="Type a message..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              />
              <button 
                onClick={handleSendMessage}
                className="bg-retro-gray border-2 border-t-white border-l-white border-r-gray-800 border-b-gray-800 px-3 py-1 font-bold text-xs hover:bg-gray-200 active:border-t-gray-800 active:border-l-gray-800 active:border-r-white active:border-b-white"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 font-bold italic text-sm">
            Select a buddy to start chatting
          </div>
        )}
      </div>
    </div>
  );
}

function SearchView({ user, onViewProfile, onAddFriend }: { user: UserData, onViewProfile: (id: string) => void, onAddFriend: (id: string) => void }) {
  const [keywords, setKeywords] = useState('');
  const [searchBy, setSearchBy] = useState('username');
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
    
    try {
      const res = await fetch(apiUrl(`/api/users/search?keyword=${encodeURIComponent(keywords)}&type=${searchBy}`), {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('retro_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-4xl flex flex-col gap-6">
        
        {/* Header Text */}
        <div className="flex flex-col mb-2 items-start mt-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border-2 border-black bg-gray-300 shadow-[2px_2px_0px_#000] flex justify-center items-center">
              <span className="block w-4 h-3 bg-blue-600 border border-black"></span>
            </div>
            <h2 className="text-2xl font-bold tracking-tighter text-blue-900 leading-none">RetroNet</h2>
          </div>
          <span className="text-[10px] uppercase font-bold text-gray-500 ml-8">People Search Directory</span>
        </div>

        {/* Search Form */}
        <div className="border border-gray-400 bg-gray-200 shadow-md">
          <div className="bg-gray-400 text-white font-bold uppercase py-1 px-2 text-sm border-b border-gray-500 text-shadow-sm shadow-black focus:outline-none">
            Find People
          </div>
          <form onSubmit={handleSearch} className="p-0 text-xs text-black">
            <table className="w-full border-collapse">
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="py-2 px-4 text-right bg-gray-300 w-1/3 font-bold border-r border-gray-400">Keywords:</td>
                  <td className="py-2 px-4 w-2/3 bg-[#f0f9f0] border-b border-gray-300">
                    <input 
                      type="text" 
                      className="border border-blue-400 w-64 p-0.5 outline-none bg-white" 
                      value={keywords}
                      onChange={e => setKeywords(e.target.value)}
                    />
                  </td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-2 px-4 text-right bg-gray-300 font-bold border-r border-gray-400">Search by:</td>
                  <td className="py-2 px-4 bg-white border-b border-gray-300">
                    <select 
                      className="border border-blue-400 p-0.5 w-40 outline-none"
                      value={searchBy}
                      onChange={e => setSearchBy(e.target.value)}
                    >
                      <option value="username">Username</option>
                      <option value="interests">Interests</option>
                    </select>
                  </td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-2 px-4 text-right bg-gray-300 font-bold border-r border-gray-400">Within Radius:</td>
                  <td className="py-2 px-4 bg-[#f0f9f0] border-b border-gray-300">
                    <select className="border border-blue-400 p-0.5 w-40 outline-none disabled:bg-gray-200" disabled>
                      <option>25 miles</option>
                    </select>
                  </td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-2 px-4 text-right bg-gray-300 font-bold border-r border-gray-400">Online Now?</td>
                  <td className="py-2 px-4 bg-white">
                    <input type="checkbox" defaultChecked className="w-3 h-3" />
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="flex justify-center bg-gray-200 py-3 border-t border-gray-400 border-b border-white">
              <button 
                type="submit" 
                className="bg-gray-300 border-2 border-t-white border-l-white border-b-gray-600 border-r-gray-600 px-4 py-1 font-bold shadow-sm active:border-t-gray-600 active:border-l-gray-600 active:border-b-white active:border-r-white hover:bg-gray-200"
              >
                Search Now!
              </button>
            </div>
          </form>
        </div>

        {/* Search Results */}
        {hasSearched && (
          <div className="bg-white">
            <div className="font-bold text-sm mb-1 text-black">Search Results</div>
            <div className="border border-gray-500">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="bg-gray-300 border-b border-gray-500 text-black">
                    <th className="py-1 px-2 border-r border-gray-400 font-bold w-12">Photo</th>
                    <th className="py-1 px-2 border-r border-gray-400 font-bold w-32">Username</th>
                    <th className="py-1 px-2 border-r border-gray-400 font-bold w-20">Status</th>
                    <th className="py-1 px-2 border-r border-gray-400 font-bold">Interests</th>
                    <th className="py-1 px-2 font-bold w-40">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((resultUser, idx) => (
                    <tr key={resultUser._id} className={`border-b border-gray-400 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#e0e8ff]'}`}>
                      <td className="p-1 border-r border-gray-400 flex justify-center items-center">
                        <div className="w-10 h-10 border border-black bg-blue-100">
                          <img src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${resultUser.name}`} alt="avatar" className="w-full h-full object-cover" />
                        </div>
                      </td>
                      <td className="p-2 border-r border-gray-400 font-bold">
                        <button onClick={() => onViewProfile(resultUser._id)} className="text-blue-800 hover:underline">{resultUser.displayName || resultUser.name}</button>
                      </td>
                      <td className="p-2 border-r border-gray-400">
                        <span className={idx % 2 === 0 ? "text-green-700" : "text-gray-600"}>
                          {idx % 2 === 0 ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td className="p-2 border-r border-gray-400 text-left">
                        {resultUser.interests?.general || 'None'}
                      </td>
                      <td className="p-2 font-bold text-blue-800 space-x-1">
                        {resultUser._id === user._id ? (
                          <span className="text-gray-500 text-[10px]">[You]</span>
                        ) : user.friends?.some((f: any) => f._id === resultUser._id) ? (
                          <span className="text-gray-500 text-[10px] line-through">[Already Friends]</span>
                        ) : (
                          <button onClick={() => onAddFriend(resultUser._id)} className="hover:underline text-[10px]">[Add Friend]</button>
                        )}
                        <span className="text-black text-[10px]">|</span>
                        <a href="#" className="hover:underline text-[10px]">[Message]</a>
                      </td>
                    </tr>
                  ))}
                  
                  {results.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-gray-500 text-center font-bold">
                        No results found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="bg-gray-100 py-1 text-center text-[10px] text-blue-900 border-t border-gray-400">
                Result Pages: <strong>[1]</strong> <a href="#" className="hover:underline">2</a> <a href="#" className="hover:underline">3</a> <a href="#" className="hover:underline">[Next {'>'}{'>'}]</a>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}



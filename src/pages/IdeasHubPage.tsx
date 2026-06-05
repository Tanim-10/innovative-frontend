import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ThumbsUp, ThumbsDown, MessageCircle, FileText, ExternalLink, 
  Plus, Search, Eye, EyeOff, Trash2, FolderOpen, Shield, 
  Sparkles, Upload, X, Share2, Check, Download, AlertCircle, Bookmark, ChevronDown, ChevronUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ideasApi, Idea, IdeaComment } from '../services/api';
import { toast } from 'sonner';

const CATEGORIES = ['All', 'Robotics', 'IoT', 'Electronics', 'Software', 'Other'];

const IdeasHubPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'community' | 'structured'>('community');
  
  // Search, Filters & Sorting
  const [category, setCategory] = useState<string>('All');
  const [search, setSearch] = useState<string>('');
  const [sort, setSort] = useState<'latest' | 'upvotes'>('latest');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  
  // Data State
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [page, setPage] = useState<number>(0);
  const LIMIT = 10;

  // Active expanded comments per post ID
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentsData, setCommentsData] = useState<Record<string, IdeaComment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});

  // Modals state
  const [isStructuredModalOpen, setIsStructuredModalOpen] = useState<boolean>(false);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  
  // New Community Post Form State
  const [communityText, setCommunityText] = useState<string>('');
  const [communityPhotos, setCommunityPhotos] = useState<File[]>([]);
  const [communityPhotoPreviews, setCommunityPhotoPreviews] = useState<string[]>([]);
  const [isSubmittingPost, setIsSubmittingPost] = useState<boolean>(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // New Structured Idea Form State
  const [structuredForm, setStructuredForm] = useState({
    title: '',
    category: 'Robotics',
    description: '',
    problemStatement: '',
    solution: '',
    techStack: '',
    links: ''
  });
  const [structuredPhotos, setStructuredPhotos] = useState<File[]>([]);
  const [structuredPhotoPreviews, setStructuredPhotoPreviews] = useState<string[]>([]);
  const [structuredFiles, setStructuredFiles] = useState<File[]>([]);
  const [isSubmittingStructured, setIsSubmittingStructured] = useState<boolean>(false);
  const structPhotoRef = useRef<HTMLInputElement>(null);
  const structFileRef = useRef<HTMLInputElement>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 450);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch ideas when parameters change
  useEffect(() => {
    setPage(0);
    fetchIdeas(0, true);
  }, [activeTab, category, debouncedSearch, sort]);

  const fetchIdeas = async (pageNum: number, isNewQuery: boolean = false) => {
    setIsLoading(true);
    try {
      const res = await ideasApi.getAll({
        type: activeTab,
        category: category === 'All' ? undefined : category,
        search: debouncedSearch || undefined,
        skip: pageNum * LIMIT,
        limit: LIMIT,
        sort: sort
      });

      if (res.success) {
        if (isNewQuery) {
          setIdeas(res.data);
        } else {
          setIdeas(prev => [...prev, ...res.data]);
        }
        setHasMore(res.data.length === LIMIT);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch ideas');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchIdeas(nextPage, false);
  };

  // Auth Guard Helper
  const checkAuth = (actionName: string): boolean => {
    if (!user) {
      toast.error(`Please log in to ${actionName}`);
      navigate('/login');
      return false;
    }
    return true;
  };

  // Voting
  const handleVote = async (ideaId: string, voteType: 'up' | 'down') => {
    if (!checkAuth('vote')) return;

    // Optimistic Update
    const currentUserId = user?._id || user?.id || '';
    setIdeas(prev => 
      prev.map(idea => {
        if (idea._id !== ideaId) return idea;
        
        let newUpvotes = [...idea.upvotes];
        let newDownvotes = [...idea.downvotes];

        const upIdx = newUpvotes.indexOf(currentUserId);
        const downIdx = newDownvotes.indexOf(currentUserId);

        if (voteType === 'up') {
          if (upIdx > -1) {
            newUpvotes.splice(upIdx, 1); // remove upvote
          } else {
            newUpvotes.push(currentUserId); // add upvote
            if (downIdx > -1) newDownvotes.splice(downIdx, 1); // remove downvote
          }
        } else {
          if (downIdx > -1) {
            newDownvotes.splice(downIdx, 1); // remove downvote
          } else {
            newDownvotes.push(currentUserId); // add downvote
            if (upIdx > -1) newUpvotes.splice(upIdx, 1); // remove upvote
          }
        }

        return {
          ...idea,
          upvotes: newUpvotes,
          downvotes: newDownvotes
        };
      })
    );

    try {
      const res = await ideasApi.vote(ideaId, voteType);
      if (res.success) {
        // Sync final array values from backend
        setIdeas(prev =>
          prev.map(idea => {
            if (idea._id !== ideaId) return idea;
            return {
              ...idea,
              upvotes: res.data.upvotes,
              downvotes: res.data.downvotes
            };
          })
        );
      }
    } catch (err: any) {
      toast.error(err.message || 'Voting failed');
    }
  };

  // Comments toggling and loading
  const toggleComments = async (ideaId: string) => {
    const isExpanded = !expandedComments[ideaId];
    setExpandedComments(prev => ({ ...prev, [ideaId]: isExpanded }));

    if (isExpanded && !commentsData[ideaId]) {
      setLoadingComments(prev => ({ ...prev, [ideaId]: true }));
      try {
        const res = await ideasApi.getComments(ideaId);
        if (res.success) {
          setCommentsData(prev => ({ ...prev, [ideaId]: res.data }));
        }
      } catch (err: any) {
        toast.error('Failed to load comments');
      } finally {
        setLoadingComments(prev => ({ ...prev, [ideaId]: false }));
      }
    }
  };

  // Post comment
  const handleAddComment = async (ideaId: string) => {
    if (!checkAuth('comment')) return;
    const commentText = newCommentText[ideaId]?.trim();
    if (!commentText) return;

    try {
      const res = await ideasApi.addComment(ideaId, commentText);
      if (res.success) {
        // Append comment to local state
        setCommentsData(prev => ({
          ...prev,
          [ideaId]: [...(prev[ideaId] || []), res.data]
        }));
        // Reset comment input
        setNewCommentText(prev => ({ ...prev, [ideaId]: '' }));
        // Update commentsCount in ideas list
        setIdeas(prev =>
          prev.map(idea => {
            if (idea._id === ideaId) {
              return { ...idea, commentsCount: (idea.commentsCount || 0) + 1 };
            }
            return idea;
          })
        );
        toast.success('Comment added!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to add comment');
    }
  };

  // Delete Comment
  const handleDeleteComment = async (ideaId: string, commentId: string) => {
    try {
      const res = await ideasApi.deleteComment(commentId);
      if (res.success) {
        setCommentsData(prev => ({
          ...prev,
          [ideaId]: (prev[ideaId] || []).filter(c => c._id !== commentId)
        }));
        setIdeas(prev =>
          prev.map(idea => {
            if (idea._id === ideaId) {
              return { ...idea, commentsCount: Math.max(0, (idea.commentsCount || 0) - 1) };
            }
            return idea;
          })
        );
        toast.success('Comment deleted');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete comment');
    }
  };

  // Hide Comment (Admin only)
  const handleHideComment = async (ideaId: string, commentId: string) => {
    try {
      const res = await ideasApi.toggleHideComment(commentId);
      if (res.success) {
        setCommentsData(prev => ({
          ...prev,
          [ideaId]: (prev[ideaId] || []).map(c => {
            if (c._id === commentId) {
              return { ...c, isHidden: res.data.isHidden };
            }
            return c;
          })
        }));
        toast.success(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle visibility');
    }
  };

  // Hide Idea (Admin only)
  const handleHideIdea = async (ideaId: string) => {
    try {
      const res = await ideasApi.toggleHideIdea(ideaId);
      if (res.success) {
        setIdeas(prev =>
          prev.map(idea => {
            if (idea._id === ideaId) {
              return { ...idea, isHidden: res.data.isHidden };
            }
            return idea;
          })
        );
        toast.success(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Moderation failed');
    }
  };

  // Delete Idea
  const handleDeleteIdea = async (ideaId: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      const res = await ideasApi.delete(ideaId);
      if (res.success) {
        setIdeas(prev => prev.filter(idea => idea._id !== ideaId));
        setSelectedIdea(null);
        toast.success('Idea deleted successfully');
      }
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    }
  };

  // Photo handlers for Community Form
  const handleCommunityPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    
    // Validate images
    const images = selected.filter(file => file.type.startsWith('image/'));
    if (images.length !== selected.length) {
      toast.warning('Some files were ignored because they were not images');
    }

    setCommunityPhotos(prev => [...prev, ...images].slice(0, 5));

    // Create preview URLs
    const previews = images.map(file => URL.createObjectURL(file));
    setCommunityPhotoPreviews(prev => [...prev, ...previews].slice(0, 5));
  };

  const removeCommunityPhoto = (index: number) => {
    URL.revokeObjectURL(communityPhotoPreviews[index]);
    setCommunityPhotos(prev => prev.filter((_, i) => i !== index));
    setCommunityPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Submit Community Post
  const submitCommunityPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkAuth('post')) return;
    if (!communityText.trim()) {
      toast.error('Post content cannot be empty');
      return;
    }

    setIsSubmittingPost(true);
    try {
      const fd = new FormData();
      fd.append('type', 'community');
      fd.append('description', communityText.trim());
      fd.append('category', 'Other'); // default for simple posts

      communityPhotos.forEach(photo => {
        fd.append('photos', photo);
      });

      const res = await ideasApi.create(fd);
      if (res.success) {
        setIdeas(prev => [res.data, ...prev]);
        setCommunityText('');
        setCommunityPhotos([]);
        setCommunityPhotoPreviews([]);
        toast.success('Shared in community!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setIsSubmittingPost(false);
    }
  };

  // Photo & File Handlers for Structured Form
  const handleStructPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    const images = selected.filter(file => file.type.startsWith('image/'));
    
    setStructuredPhotos(prev => [...prev, ...images].slice(0, 5));
    const previews = images.map(file => URL.createObjectURL(file));
    setStructuredPhotoPreviews(prev => [...prev, ...previews].slice(0, 5));
  };

  const removeStructPhoto = (index: number) => {
    URL.revokeObjectURL(structuredPhotoPreviews[index]);
    setStructuredPhotos(prev => prev.filter((_, i) => i !== index));
    setStructuredPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleStructFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    
    const allowedTypes = [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    const docs = selected.filter(file => allowedTypes.includes(file.type) || file.name.endsWith('.ppt') || file.name.endsWith('.pptx'));
    
    if (docs.length !== selected.length) {
      toast.warning('Only PDF and PPT/PPTX files are allowed');
    }

    setStructuredFiles(prev => [...prev, ...docs].slice(0, 3));
  };

  const removeStructFile = (index: number) => {
    setStructuredFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Submit Structured Idea
  const submitStructuredIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkAuth('submit an idea')) return;
    
    const { title, category, description, problemStatement, solution } = structuredForm;
    if (!title.trim() || !description.trim() || !problemStatement.trim() || !solution.trim()) {
      toast.error('Title, Description, Problem Statement, and Solution are required.');
      return;
    }

    setIsSubmittingStructured(true);
    try {
      const fd = new FormData();
      fd.append('type', 'structured');
      fd.append('title', title.trim());
      fd.append('category', category);
      fd.append('description', description.trim());
      fd.append('problemStatement', problemStatement.trim());
      fd.append('solution', solution.trim());

      const stack = structuredForm.techStack.split(',').map(s => s.trim()).filter(Boolean);
      fd.append('techStack', JSON.stringify(stack));

      const lks = structuredForm.links.split(',').map(s => s.trim()).filter(Boolean);
      fd.append('links', JSON.stringify(lks));

      structuredPhotos.forEach(p => fd.append('photos', p));
      structuredFiles.forEach(f => fd.append('files', f));

      const res = await ideasApi.create(fd);
      if (res.success) {
        setIdeas(prev => [res.data, ...prev]);
        setStructuredForm({
          title: '',
          category: 'Robotics',
          description: '',
          problemStatement: '',
          solution: '',
          techStack: '',
          links: ''
        });
        setStructuredPhotos([]);
        setStructuredPhotoPreviews([]);
        setStructuredFiles([]);
        setIsStructuredModalOpen(false);
        toast.success('Structured Idea uploaded!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit structured idea');
    } finally {
      setIsSubmittingStructured(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getAuthorDisplay = (item: Idea | IdeaComment) => {
    if (item.adminId) {
      const adminObj = typeof item.adminId === 'object' ? item.adminId : null;
      return {
        name: adminObj?.email ? adminObj.email.split('@')[0] + ' (Admin)' : 'Admin',
        profileImage: '',
        role: 'admin',
        userId: '',
        isAdmin: true
      };
    }
    const userObj = typeof item.userId === 'object' ? item.userId : null;
    return {
      name: userObj?.name || 'Anonymous User',
      profileImage: userObj?.profileImage || '',
      role: userObj?.role || 'student',
      userId: userObj?._id || '',
      isAdmin: false
    };
  };

  return (
    <>
      {/* Light theme styled page background */}
      <div className="network-bg min-h-screen py-10 sm:py-16 md:py-20 text-foreground">
        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          
          {/* Header Banner */}
          <div className="text-center mb-10 pt-4 animate-fade-scale-in">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              INNOVATION CONNECTOR
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-foreground mb-3 italic tracking-tight">
              Ideas & Resource Hub
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
              Share your project concepts, upload technical resources (PDF/PPT), upvote creative concepts, and collaborate with makers and engineers.
            </p>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-col gap-6 bg-card/60 backdrop-blur-sm border border-border/80 rounded-2xl p-5 md:p-6 mb-8 shadow-xl">
            
            {/* Main Tabs */}
            <div className="flex border-b border-border pb-4 justify-between items-center flex-wrap gap-4">
              <div className="flex bg-muted/60 p-1 rounded-xl border border-border/40">
                <button
                  onClick={() => setActiveTab('community')}
                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                    activeTab === 'community'
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Community Feed
                </button>
                <button
                  onClick={() => setActiveTab('structured')}
                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                    activeTab === 'structured'
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Structured Ideas
                </button>
              </div>

              {/* Submit triggers */}
              <div>
                {activeTab === 'community' ? (
                  <a href="#community-editor">
                    <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 py-2.5 rounded-xl shadow-md transition-all text-sm">
                      <Plus className="w-4 h-4" />
                      Write Post
                    </button>
                  </a>
                ) : (
                  <button 
                    onClick={() => {
                      if (checkAuth('submit an idea')) setIsStructuredModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 py-2.5 rounded-xl shadow-md transition-all text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Submit Detailed Idea
                  </button>
                )}
              </div>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-4 items-center">
              
              {/* Category list */}
              <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-thin">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap border transition-all duration-200 ${
                      category === cat
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/40 border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Sort Select */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-semibold uppercase">Sort:</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as any)}
                  className="bg-background border border-input rounded-xl text-xs px-3 py-2 text-foreground outline-none cursor-pointer hover:border-border/60 transition-all font-semibold"
                >
                  <option value="latest">Latest</option>
                  <option value="upvotes">Top Upvoted</option>
                </select>
              </div>

              {/* Search Box */}
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search hub ideas..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl text-xs pl-10 pr-4 py-2 outline-none focus:border-primary transition-all text-foreground placeholder-muted-foreground"
                />
              </div>

            </div>
          </div>

          {/* Main Grid Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Left/Main Column: List Feed */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Community post editor */}
              {activeTab === 'community' && (
                <div id="community-editor" className="bg-card/60 border border-border/85 rounded-2xl p-5 shadow-md backdrop-blur-sm">
                  <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Share something with the community
                  </h3>
                  <form onSubmit={submitCommunityPost} className="space-y-4">
                    <textarea
                      placeholder="What is your latest robotics concept or electronics hack? Describe it here..."
                      value={communityText}
                      onChange={(e) => setCommunityText(e.target.value)}
                      rows={3}
                      className="w-full bg-background border border-input rounded-xl p-4 text-sm outline-none focus:border-primary text-foreground placeholder-muted-foreground resize-none"
                    />

                    {/* Previews */}
                    {communityPhotoPreviews.length > 0 && (
                      <div className="grid grid-cols-5 gap-3">
                        {communityPhotoPreviews.map((preview, idx) => (
                          <div key={idx} className="relative aspect-square border border-border rounded-xl overflow-hidden group">
                            <img src={preview} alt="upload preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeCommunityPhoto(idx)}
                              className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center border-t border-border pt-3">
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleCommunityPhotoChange}
                          ref={photoInputRef}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (checkAuth('upload photos')) photoInputRef.current?.click();
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border rounded-xl text-xs font-semibold transition-colors"
                        >
                          <Upload className="w-4 h-4 text-primary" />
                          Add Photos (Max 5)
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingPost}
                        className="bg-primary hover:bg-primary/95 disabled:opacity-50 text-primary-foreground px-5 py-2.5 rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 shadow-md"
                      >
                        {isSubmittingPost ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                            Uploading...
                          </>
                        ) : 'Post to Feed'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Loader Skeleton */}
              {isLoading && ideas.length === 0 ? (
                <div className="space-y-6">
                  {[1, 2, 3].map(n => (
                    <div key={n} className="bg-card border border-border/60 rounded-2xl p-6 space-y-4 skeleton-shimmer">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted" />
                        <div className="space-y-2">
                          <div className="w-24 h-3.5 bg-muted rounded" />
                          <div className="w-16 h-3 bg-muted rounded" />
                        </div>
                      </div>
                      <div className="w-full h-16 bg-muted rounded-xl" />
                      <div className="flex gap-4">
                        <div className="w-12 h-8 bg-muted rounded-xl" />
                        <div className="w-12 h-8 bg-muted rounded-xl" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : ideas.length === 0 ? (
                /* Empty State */
                <div className="text-center py-20 bg-card border border-border/80 rounded-3xl p-6">
                  <FolderOpen className="w-14 h-14 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-foreground mb-1">No Ideas Found</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Be the first to share your creative project idea or upload technical files to start the discussion!
                  </p>
                </div>
              ) : (
                /* Ideas List Feed */
                <div className="space-y-6">
                  {ideas.map(idea => {
                    const author = getAuthorDisplay(idea);
                    const isSelf = user && (
                      idea.adminId 
                        ? (typeof idea.adminId === 'object' && idea.adminId?._id === user?._id) 
                        : (typeof idea.userId === 'object' && idea.userId?._id === user?._id)
                    );
                    
                    const userVotedUp = user && idea.upvotes.includes(user._id || user.id || '');
                    const userVotedDown = user && idea.downvotes.includes(user._id || user.id || '');

                    // Community Tab Layout
                    if (idea.type === 'community') {
                      return (
                        <div 
                          key={idea._id} 
                          className={`bg-card border rounded-2xl p-5 md:p-6 shadow-md relative transition-all duration-300 ${
                            idea.isHidden ? 'border-amber-500 bg-amber-500/5' : 'border-border/80 hover:border-primary/30'
                          }`}
                        >
                          {/* Mod flags */}
                          {idea.isHidden && (
                            <div className="absolute top-4 right-4 flex items-center gap-1 text-amber-600 text-[10px] uppercase font-bold tracking-wider bg-amber-500/10 px-2 py-0.5 border border-amber-500/20 rounded-md">
                              <Shield className="w-3 h-3" />
                              Hidden by Admin
                            </div>
                          )}

                          {/* Author Info header */}
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              {author.profileImage ? (
                                <img src={author.profileImage} alt={author.name} className="w-10 h-10 rounded-full object-cover border border-border shrink-0" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold uppercase shrink-0 border border-primary/20 text-sm">
                                  {author.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                {author.isAdmin ? (
                                  <span className="text-sm font-bold text-foreground flex items-center gap-1">
                                    {author.name}
                                    <span className="bg-primary/20 border border-primary/30 text-primary text-[9px] font-bold uppercase px-1 rounded">MOD</span>
                                  </span>
                                ) : (
                                  <Link to={`/profile/${author.userId}`} className="text-sm font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                                    {author.name}
                                    <span className="text-[10px] text-muted-foreground font-semibold capitalize bg-muted border border-border px-1.5 rounded">{author.role}</span>
                                  </Link>
                                )}
                                <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(idea.createdAt)}</p>
                              </div>
                            </div>

                            {/* Options dropdown / deletion */}
                            <div className="flex items-center gap-2">
                              {user?.role === 'admin' && (
                                <button
                                  onClick={() => handleHideIdea(idea._id)}
                                  className={`p-2 border rounded-xl transition-all ${
                                    idea.isHidden 
                                      ? 'bg-amber-500/20 text-amber-600 border-amber-500/35 hover:bg-amber-500/30'
                                      : 'bg-muted/50 text-muted-foreground border-border hover:text-foreground hover:bg-muted'
                                  }`}
                                  title={idea.isHidden ? 'Make visible' : 'Hide from users'}
                                >
                                  {idea.isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </button>
                              )}
                              {(isSelf || user?.role === 'admin') && (
                                <button
                                  onClick={() => handleDeleteIdea(idea._id)}
                                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/20 hover:border-red-500/40 rounded-xl transition-all"
                                  title="Delete post"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Body text */}
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line mb-4">
                            {idea.description}
                          </p>

                          {/* Image Gallery */}
                          {idea.photos.length > 0 && (
                            <div className={`grid gap-3.5 mb-4 ${
                              idea.photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'
                            }`}>
                              {idea.photos.map((photo, pIdx) => (
                                <a key={pIdx} href={photo} target="_blank" rel="noopener noreferrer" className="block aspect-video rounded-xl overflow-hidden border border-border hover:border-primary/20 transition-all bg-muted/20">
                                  <img src={photo} alt="attached media" className="w-full h-full object-cover hover:scale-[1.01] transition-transform duration-300" />
                                </a>
                              ))}
                            </div>
                          )}

                          {/* Footer Actions */}
                          <div className="flex items-center justify-between border-t border-border pt-4">
                            <div className="flex items-center gap-2">
                              {/* Upvote */}
                              <button
                                onClick={() => handleVote(idea._id, 'up')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                                  userVotedUp
                                    ? 'bg-primary/20 border-primary text-primary'
                                    : 'bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                                }`}
                              >
                                <ThumbsUp className="w-4 h-4" />
                                <span>{idea.upvotes.length}</span>
                              </button>
                              
                              {/* Downvote */}
                              <button
                                onClick={() => handleVote(idea._id, 'down')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                                  userVotedDown
                                    ? 'bg-red-500/20 border-red-500/40 text-red-600'
                                    : 'bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                                }`}
                              >
                                <ThumbsDown className="w-4 h-4" />
                                <span>{idea.downvotes.length}</span>
                              </button>
                            </div>

                            {/* Comment toggle */}
                            <button
                              onClick={() => toggleComments(idea._id)}
                              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                                expandedComments[idea._id]
                                  ? 'bg-muted border-border text-foreground'
                                  : 'bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                              }`}
                            >
                              <MessageCircle className="w-4 h-4 text-primary" />
                              <span>{idea.commentsCount} Comments</span>
                              {expandedComments[idea._id] ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
                            </button>
                          </div>

                          {/* Comments section */}
                          {expandedComments[idea._id] && (
                            <div className="border-t border-border mt-4 pt-4 space-y-4">
                              {/* Comments List */}
                              {loadingComments[idea._id] ? (
                                <div className="flex justify-center py-4">
                                  <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                                </div>
                              ) : (commentsData[idea._id] || []).length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-2">No comments yet. Write one below!</p>
                              ) : (
                                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                                  {(commentsData[idea._id] || []).map(comment => {
                                    const cAuthor = getAuthorDisplay(comment);
                                    const isCowner = user && (
                                      comment.adminId
                                        ? (typeof comment.adminId === 'object' && comment.adminId?._id === user?._id)
                                        : (typeof comment.userId === 'object' && comment.userId?._id === user?._id)
                                    );

                                    return (
                                      <div 
                                        key={comment._id} 
                                        className={`p-3 rounded-xl border text-xs leading-relaxed transition-all ${
                                          comment.isHidden 
                                            ? 'bg-amber-500/5 border-amber-500/25 opacity-70' 
                                            : 'bg-muted/30 border-border/50 hover:border-border/80'
                                        }`}
                                      >
                                        <div className="flex justify-between items-start mb-1.5">
                                          <div className="flex items-center gap-2">
                                            {cAuthor.profileImage ? (
                                              <img src={cAuthor.profileImage} alt={cAuthor.name} className="w-6 h-6 rounded-full object-cover" />
                                            ) : (
                                              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[9px] uppercase border border-primary/20">
                                                {cAuthor.name.charAt(0)}
                                              </div>
                                            )}
                                            <div>
                                              {cAuthor.isAdmin ? (
                                                <span className="font-bold text-foreground flex items-center gap-1">
                                                  {cAuthor.name}
                                                  <span className="bg-primary/20 text-primary text-[8px] font-bold px-0.5 rounded">MOD</span>
                                                </span>
                                              ) : (
                                                <Link to={`/profile/${cAuthor.userId}`} className="font-bold text-foreground hover:text-primary transition-colors">
                                                  {cAuthor.name}
                                                </Link>
                                              )}
                                              <span className="text-[9px] text-muted-foreground ml-2 font-normal">{formatDate(comment.createdAt)}</span>
                                            </div>
                                          </div>

                                          {/* Options */}
                                          <div className="flex items-center gap-1.5">
                                            {user?.role === 'admin' && (
                                              <button
                                                onClick={() => handleHideComment(idea._id, comment._id)}
                                                className={`p-1 border rounded-lg transition-colors ${
                                                  comment.isHidden ? 'bg-amber-500/20 text-amber-600 border-amber-500/30' : 'text-muted-foreground border-transparent hover:text-foreground'
                                                }`}
                                                title="Toggle comment visibility"
                                              >
                                                <EyeOff className="w-3.5 h-3.5" />
                                              </button>
                                            )}
                                            {(isCowner || user?.role === 'admin') && (
                                              <button
                                                onClick={() => handleDeleteComment(idea._id, comment._id)}
                                                className="p-1 text-red-600 hover:text-red-500 rounded"
                                                title="Delete comment"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            )}
                                          </div>
                                        </div>

                                        <p className="text-foreground pl-8 whitespace-pre-wrap font-medium">
                                          {comment.comment}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Comment Editor */}
                              <div className="flex items-center gap-2 pt-2">
                                <input
                                  type="text"
                                  placeholder="Write a comment..."
                                  value={newCommentText[idea._id] || ''}
                                  onChange={(e) => setNewCommentText(prev => ({ ...prev, [idea._id]: e.target.value }))}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddComment(idea._id);
                                    }
                                  }}
                                  className="flex-1 bg-background border border-input rounded-xl px-4 py-2 text-xs text-foreground outline-none focus:border-primary placeholder-muted-foreground"
                                />
                                <button
                                  onClick={() => handleAddComment(idea._id)}
                                  className="px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl text-xs font-bold transition-colors"
                                >
                                  Reply
                                </button>
                              </div>
                            </div>
                          )}

                        </div>
                      );
                    }

                    // Structured Tab Layout
                    return (
                      <div 
                        key={idea._id}
                        className={`bg-card border rounded-2xl p-5 md:p-6 shadow-md relative transition-all duration-300 cursor-pointer ${
                          idea.isHidden ? 'border-amber-500 bg-amber-500/5' : 'border-border/80 hover:border-primary/45 hover:-translate-y-0.5 hover:shadow-lg'
                        }`}
                        onClick={() => setSelectedIdea(idea)}
                      >
                        {/* Hidden flag */}
                        {idea.isHidden && (
                          <div className="absolute top-4 right-4 flex items-center gap-1 text-amber-600 text-[10px] uppercase font-bold tracking-wider bg-amber-500/10 px-2 py-0.5 border border-amber-500/20 rounded-md">
                            <Shield className="w-3.5 h-3.5" />
                            Hidden
                          </div>
                        )}

                        <div className="flex justify-between items-start mb-3.5">
                          <span className="px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase rounded-md">
                            {idea.category}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{formatDate(idea.createdAt)}</span>
                        </div>

                        <h3 className="text-base font-extrabold text-foreground mb-2 line-clamp-1 hover:text-primary transition-colors">
                          {idea.title}
                        </h3>

                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-4">
                          {idea.description}
                        </p>

                        {/* Tech Stack tags */}
                        {idea.techStack && idea.techStack.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {idea.techStack.map((tech, tIdx) => (
                              <span key={tIdx} className="px-2 py-0.5 bg-muted border border-border rounded-md text-[9px] font-semibold text-muted-foreground">
                                {tech}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Files indicator */}
                        {idea.files.length > 0 && (
                          <div className="flex items-center gap-1.5 text-xs text-primary font-semibold mb-4 bg-primary/5 p-2 rounded-xl border border-primary/10 max-w-max">
                            <FileText className="w-4 h-4" />
                            <span>{idea.files.length} Technical document(s) uploaded</span>
                          </div>
                        )}

                        {/* Footer details */}
                        <div className="flex items-center justify-between border-t border-border pt-3.5 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            {author.profileImage ? (
                              <img src={author.profileImage} alt={author.name} className="w-5 h-5 rounded-full object-cover border border-border" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[8px] uppercase border border-primary/20">
                                {author.name.charAt(0)}
                              </div>
                            )}
                            <span className="truncate max-w-[100px] text-[10px] font-medium text-foreground">{author.name}</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <ThumbsUp className="w-3.5 h-3.5 text-primary" />
                              {idea.upvotes.length}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="w-3.5 h-3.5 text-primary" />
                              {idea.commentsCount}
                            </span>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

              {/* Load More Button */}
              {hasMore && !isLoading && ideas.length > 0 && (
                <div className="text-center pt-4">
                  <button
                    onClick={loadMore}
                    className="px-6 py-2.5 bg-card hover:bg-muted border border-border hover:border-border/80 text-xs font-bold text-muted-foreground hover:text-foreground rounded-xl transition-all shadow-md"
                  >
                    Load More Posts
                  </button>
                </div>
              )}

            </div>

            {/* Right Column */}
            <div className="space-y-6">
              
              {/* Profile overview card */}
              <div className="bg-card border border-border/85 rounded-2xl p-5 shadow-lg">
                <h3 className="text-xs font-bold text-foreground mb-4 flex items-center gap-2 uppercase tracking-wide">
                  <Shield className="w-4 h-4 text-primary" />
                  Your Profile Status
                </h3>
                {user ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      {user.profileImage ? (
                        <img src={user.profileImage} alt={user.name} className="w-12 h-12 rounded-full object-cover border border-border" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold uppercase text-lg border border-primary/20">
                          {user.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-bold text-foreground">{user.name}</h4>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-primary/10 border border-primary/20 text-[9px] font-bold uppercase rounded text-primary">
                          {user.role || 'Student'}
                        </span>
                      </div>
                    </div>

                    {user.bio ? (
                      <p className="text-xs text-muted-foreground italic line-clamp-2">"{user.bio}"</p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No bio written yet. Click View Profile to edit.</p>
                    )}

                    <div className="flex gap-2.5 pt-2">
                      <Link to={`/profile/${user._id || user.id}`} className="flex-1">
                        <button className="w-full py-2 bg-muted hover:bg-muted/80 border border-border text-xs font-bold text-foreground rounded-xl transition-all">
                          View Profile
                        </button>
                      </Link>
                      <Link to="/account" className="flex-1">
                        <button className="w-full py-2 bg-transparent hover:bg-muted/40 border border-border text-xs font-bold text-muted-foreground hover:text-foreground rounded-xl transition-all">
                          Account Settings
                        </button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 space-y-3">
                    <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
                    <p className="text-xs text-muted-foreground">Log in to vote, post ideas, share documents, and comment on community hacks.</p>
                    <button
                      onClick={() => navigate('/login')}
                      className="w-full py-2 bg-primary hover:bg-primary/95 text-xs font-bold text-primary-foreground rounded-xl transition-all shadow-md shadow-primary/15"
                    >
                      Log In to Innovative Hub
                    </button>
                  </div>
                )}
              </div>

              {/* Guidelines card */}
              <div className="bg-card border border-border/85 rounded-2xl p-5 shadow-lg text-xs text-muted-foreground space-y-3.5">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wide">
                  <FileText className="w-4 h-4 text-primary" />
                  Hub Guidelines
                </h3>
                <p>Collaborating here helps build robotics and IoT projects. Keep posts engineering-focused.</p>
                <div className="space-y-2 border-t border-border pt-3">
                  <div className="flex gap-2">
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                    <span><strong>Structured Form:</strong> Fill out problem statements and solutions. Add tech stack list.</span>
                  </div>
                  <div className="flex gap-2">
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                    <span><strong>Media support:</strong> Upload PPT/PPTX presentation slides and PDF schematics (max 25MB).</span>
                  </div>
                  <div className="flex gap-2">
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                    <span><strong>Moderation:</strong> Admins can hide or delete posts violating community rules.</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>

      {/* MODAL 1: Structured Idea Detailed View */}
      {selectedIdea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in animate-duration-200">
          <div className="bg-card border border-border rounded-3xl w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl p-6 relative text-sm text-foreground">
            
            {/* Close Button */}
            <button
              onClick={() => setSelectedIdea(null)}
              className="absolute top-4 right-4 p-2 bg-muted/65 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header info */}
            <div className="mb-6 pr-8">
              <span className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase rounded-md">
                {selectedIdea.category}
              </span>
              <h2 className="text-xl md:text-2xl font-extrabold text-foreground mt-3 mb-2">{selectedIdea.title}</h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>Published: {formatDate(selectedIdea.createdAt)}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-primary">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  {selectedIdea.upvotes.length} Votes
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-primary">
                  <MessageCircle className="w-3.5 h-3.5" />
                  {selectedIdea.commentsCount} Comments
                </span>
              </div>
            </div>

            {/* Detailed Body content */}
            <div className="space-y-5 border-t border-border pt-5">
              
              {/* Summary */}
              <div>
                <h4 className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1.5">Executive Summary</h4>
                <p className="leading-relaxed text-foreground font-medium">{selectedIdea.description}</p>
              </div>

              {/* Problem Statement */}
              <div>
                <h4 className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1.5">Problem Statement</h4>
                <p className="leading-relaxed text-foreground font-medium whitespace-pre-line">{selectedIdea.problemStatement}</p>
              </div>

              {/* Solution */}
              <div>
                <h4 className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1.5">Proposed Solution</h4>
                <p className="leading-relaxed text-foreground font-medium whitespace-pre-line">{selectedIdea.solution}</p>
              </div>

              {/* Tech Stack */}
              {selectedIdea.techStack && selectedIdea.techStack.length > 0 && (
                <div>
                  <h4 className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">Technology Stack</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedIdea.techStack.map((tech, idx) => (
                      <span key={idx} className="px-3 py-1 bg-muted border border-border rounded-lg text-xs font-semibold text-foreground">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* External Links */}
              {selectedIdea.links && selectedIdea.links.length > 0 && (
                <div>
                  <h4 className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">Resource & Source Links</h4>
                  <div className="space-y-1.5">
                    {selectedIdea.links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.startsWith('http') ? link : `https://${link}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {link}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Media gallery */}
              {selectedIdea.photos && selectedIdea.photos.length > 0 && (
                <div>
                  <h4 className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2.5">Project Photos</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedIdea.photos.map((photo, idx) => (
                      <a key={idx} href={photo} target="_blank" rel="noopener noreferrer" className="block aspect-video rounded-xl overflow-hidden border border-border bg-muted/20">
                        <img src={photo} alt={`concept view ${idx + 1}`} className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Attached files */}
              {selectedIdea.files && selectedIdea.files.length > 0 && (
                <div>
                  <h4 className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2.5">Schematics, Slides, or Specifications</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedIdea.files.map((file, idx) => {
                      const isPdf = file.url.toLowerCase().endsWith('.pdf') || file.name.toLowerCase().endsWith('.pdf');
                      return (
                        <div key={idx} className="flex flex-col bg-muted/50 border border-border rounded-2xl p-4 space-y-3">
                          <div className="flex items-start gap-3 justify-between">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FileText className="w-8 h-8 text-primary shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground truncate" title={file.name}>{file.name}</p>
                                <p className="text-[10px] text-muted-foreground font-semibold uppercase mt-0.5">{isPdf ? 'PDF file' : 'Presentation File'}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 py-1.5 bg-secondary hover:bg-secondary/80 border border-border rounded-xl text-xs font-bold text-center text-foreground transition-all flex items-center justify-center gap-1.5"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download
                            </a>
                            {!isPdf && (
                              <a
                                href={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-xl text-xs font-bold text-center text-primary transition-all flex items-center justify-center gap-1.5"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Preview Online
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* Actions */}
            <div className="flex justify-between items-center border-t border-border mt-6 pt-5">
              <div className="flex gap-2">
                <button
                  onClick={() => handleVote(selectedIdea._id, 'up')}
                  className={`flex items-center gap-1.5 px-4 py-2 border rounded-xl text-xs font-bold transition-all ${
                    user && selectedIdea.upvotes.includes(user._id || user.id || '')
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'bg-muted/50 border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ThumbsUp className="w-4 h-4" />
                  Upvote ({selectedIdea.upvotes.length})
                </button>
                <button
                  onClick={() => handleVote(selectedIdea._id, 'down')}
                  className={`flex items-center gap-1.5 px-4 py-2 border rounded-xl text-xs font-bold transition-all ${
                    user && selectedIdea.downvotes.includes(user._id || user.id || '')
                      ? 'bg-red-500/20 border-red-500/40 text-red-600'
                      : 'bg-muted/50 border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ThumbsDown className="w-4 h-4" />
                  Downvote ({selectedIdea.downvotes.length})
                </button>
              </div>

              <div className="flex items-center gap-2">
                {user?.role === 'admin' && (
                  <button
                    onClick={() => {
                      handleHideIdea(selectedIdea._id);
                      setSelectedIdea(prev => prev ? { ...prev, isHidden: !prev.isHidden } : null);
                    }}
                    className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all ${
                      selectedIdea.isHidden 
                        ? 'bg-amber-500/20 text-amber-600 border-amber-500/35'
                        : 'bg-muted/50 border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {selectedIdea.isHidden ? 'Unhide Concept' : 'Hide Concept'}
                  </button>
                )}
                {((user && (selectedIdea.userId === user._id || (typeof selectedIdea.userId === 'object' && selectedIdea.userId?._id === user._id))) || user?.role === 'admin') && (
                  <button
                    onClick={() => handleDeleteIdea(selectedIdea._id)}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 rounded-xl text-xs font-bold text-red-600 transition-all flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Idea
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: Write Structured Idea Form */}
      {isStructuredModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in animate-duration-200">
          <div className="bg-card border border-border rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative text-sm text-foreground">
            
            {/* Close */}
            <button
              onClick={() => setIsStructuredModalOpen(false)}
              className="absolute top-4 right-4 p-2 bg-muted/65 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-extrabold text-foreground mb-5 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Upload Detailed Engineering Idea
            </h2>

            <form onSubmit={submitStructuredIdea} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-bold uppercase">Idea / Project Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Autonomous Maze-Solving Robot"
                    value={structuredForm.title}
                    onChange={(e) => setStructuredForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-xs text-foreground outline-none focus:border-primary placeholder-muted-foreground"
                  />
                </div>
                {/* Category */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-bold uppercase">Tech Category</label>
                  <select
                    value={structuredForm.category}
                    onChange={(e) => setStructuredForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-xs text-foreground outline-none focus:border-primary cursor-pointer font-semibold"
                  >
                    {CATEGORIES.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Brief Description */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-bold uppercase">Brief Summary</label>
                <input
                  type="text"
                  required
                  placeholder="Give a 1-sentence tagline describing what this project is..."
                  value={structuredForm.description}
                  onChange={(e) => setStructuredForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-xs text-foreground outline-none focus:border-primary placeholder-muted-foreground"
                />
              </div>

              {/* Problem Statement */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-bold uppercase">Problem Statement</label>
                <textarea
                  required
                  placeholder="What is the problem or challenge this project aims to address?..."
                  value={structuredForm.problemStatement}
                  onChange={(e) => setStructuredForm(prev => ({ ...prev, problemStatement: e.target.value }))}
                  rows={3}
                  className="w-full bg-background border border-input rounded-xl p-4 text-xs outline-none focus:border-primary text-foreground placeholder-muted-foreground resize-none"
                />
              </div>

              {/* Solution */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-bold uppercase">Proposed Solution</label>
                <textarea
                  required
                  placeholder="How does your design solve this problem? Detail the mechanics, sensors, or algorithms..."
                  value={structuredForm.solution}
                  onChange={(e) => setStructuredForm(prev => ({ ...prev, solution: e.target.value }))}
                  rows={3}
                  className="w-full bg-background border border-input rounded-xl p-4 text-xs outline-none focus:border-primary text-foreground placeholder-muted-foreground resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tech Stack */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-bold uppercase">Tech Stack (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="Arduino, ESP32, Python, LiDAR"
                    value={structuredForm.techStack}
                    onChange={(e) => setStructuredForm(prev => ({ ...prev, techStack: e.target.value }))}
                    className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-xs text-foreground outline-none focus:border-primary placeholder-muted-foreground"
                  />
                </div>
                {/* Links */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-bold uppercase">Source Links (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="github.com/maker/project, schematics.io"
                    value={structuredForm.links}
                    onChange={(e) => setStructuredForm(prev => ({ ...prev, links: e.target.value }))}
                    className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-xs text-foreground outline-none focus:border-primary placeholder-muted-foreground"
                  />
                </div>
              </div>

              {/* Photos upload */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-bold uppercase block">Add Project Photos (Max 5)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  ref={structPhotoRef}
                  onChange={handleStructPhotoChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => structPhotoRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border rounded-xl text-xs font-semibold transition-colors"
                >
                  <Upload className="w-4 h-4 text-primary" />
                  Select Images
                </button>
                {structuredPhotoPreviews.length > 0 && (
                  <div className="grid grid-cols-5 gap-3 pt-2">
                    {structuredPhotoPreviews.map((preview, idx) => (
                      <div key={idx} className="relative aspect-square border border-border rounded-xl overflow-hidden group">
                        <img src={preview} alt="upload preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeStructPhoto(idx)}
                          className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Technical files upload */}
              <div className="space-y-2 border-t border-border pt-4">
                <label className="text-xs text-muted-foreground font-bold uppercase block">Add Presentation / PDF Files (Max 3)</label>
                <input
                  type="file"
                  accept="application/pdf, application/vnd.ms-powerpoint, application/vnd.openxmlformats-officedocument.presentationml.presentation"
                  multiple
                  ref={structFileRef}
                  onChange={handleStructFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => structFileRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border rounded-xl text-xs font-semibold transition-colors"
                >
                  <Upload className="w-4 h-4 text-primary" />
                  Select Documents (PDF / PPT)
                </button>
                
                {structuredFiles.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {structuredFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-muted border border-border rounded-xl p-2.5 text-xs text-foreground">
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-primary shrink-0" />
                          <span className="truncate">{file.name}</span>
                          <span className="text-[9px] text-muted-foreground font-semibold">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeStructFile(idx)}
                          className="p-1 text-red-500 hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 justify-end border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setIsStructuredModalOpen(false)}
                  className="px-5 py-2.5 bg-transparent border border-border hover:border-border/80 text-xs font-bold text-muted-foreground hover:text-foreground rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStructured}
                  className="bg-primary hover:bg-primary/95 disabled:opacity-50 text-primary-foreground px-5 py-2.5 rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 shadow-md"
                >
                  {isSubmittingStructured ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Uploading resources...
                    </>
                  ) : 'Publish Idea'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}
    </>
  );
};

export default IdeasHubPage;

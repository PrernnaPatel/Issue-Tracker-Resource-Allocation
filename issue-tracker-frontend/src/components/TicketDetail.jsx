import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle, User, Calendar, Clock, Building2, Mail, Phone, MapPin, FileText, Download, Eye, Edit3, Send, Save, X, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { getMyTickets, getAttachment, commentOnTicket, updateTicket, revokeTicket } from '../services/authService';

const getStatusColor = (status) => {
  switch (status) {
    case 'pending':
      return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' };
    case 'in_progress':
      return { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200' };
    case 'resolved':
      return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' };
    case 'revoked':
      return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' };
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'pending':
      return <Clock size={16} />;
    case 'in_progress':
      return <AlertCircle size={16} />;
    case 'resolved':
      return <AlertCircle size={16} />;
    case 'revoked':
      return <AlertCircle size={16} />;
    default:
      return <AlertCircle size={16} />;
  }
};

const formatAttachmentName = (attachmentName) => {
  if (!attachmentName) return '';
  const parts = attachmentName.split('-');
  if (parts.length > 1) {
    return parts.slice(1).join('-');
  }
  return attachmentName;
};

const TicketDetail = () => {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAttachment, setShowAttachment] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState(null);
  const [attachmentType, setAttachmentType] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [commentAttachment, setCommentAttachment] = useState(null);
  const [previewedCommentIdx, setPreviewedCommentIdx] = useState(null);
  const [previewedCommentUrl, setPreviewedCommentUrl] = useState(null);
  const [previewedCommentType, setPreviewedCommentType] = useState(null);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokeComment, setRevokeComment] = useState('');

  useEffect(() => {
    const fetchTicketDetails = async () => {
      try {
        setLoading(true);
        const tickets = await getMyTickets();
        const foundTicket = tickets.find(t => t._id === ticketId);
        console.log(foundTicket);
        if (!foundTicket) throw new Error('Ticket not found');
        setTicket(foundTicket);
      } catch (error) {
        console.error('Error loading ticket details:', error);
        toast.error('Failed to load ticket details');
      } finally {
        setLoading(false);
      }
    };
    fetchTicketDetails();
  }, [ticketId]);

  // Clean up attachment URL on unmount
  useEffect(() => {
    return () => {
      if (attachmentUrl) {
        window.URL.revokeObjectURL(attachmentUrl);
      }
    };
  }, [attachmentUrl]);

  const handlePreviewAttachment = async () => {
    if (!ticket?.attachment) return;
    if (showAttachment) {
      setShowAttachment(false);
      if (attachmentUrl) {
        window.URL.revokeObjectURL(attachmentUrl);
        setAttachmentUrl(null);
      }
      return;
    }

    try {
      const response = await getAttachment(ticket.attachment);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Determine file type
      let type = 'unsupported';
      const contentType = response.headers.get('content-type');
      if (contentType?.startsWith('image/')) {
        type = 'image';
      } else if (contentType?.startsWith('application/pdf')) {
        type = 'pdf';
      }
      
      setAttachmentUrl(url);
      setAttachmentType(type);
      setShowAttachment(true);
    } catch (error) {
      console.error('Error fetching attachment:', error);
      toast.error('Failed to fetch attachment');
    }
  };

  const handleEditTicket = () => {
    setEditForm({
      title: ticket.title,
      description: ticket.description
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({
      title: '',
      description: ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editForm.title.trim() || !editForm.description.trim()) {
      toast.error('Title and description are required');
      return;
    }

    try {
      setIsSaving(true);
      const updatedTicket = await updateTicket(ticketId, {
        title: editForm.title,
        description: editForm.description
      });
      setTicket(updatedTicket);
      setIsEditing(false);
      toast.success('Ticket updated successfully');
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast.error('Failed to update ticket');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCommentAttachmentPreview = async (attachmentName, idx) => {
    if (previewedCommentIdx === idx) {
      if (previewedCommentUrl) window.URL.revokeObjectURL(previewedCommentUrl);
      setPreviewedCommentIdx(null);
      setPreviewedCommentUrl(null);
      setPreviewedCommentType(null);
      return;
    }
    try {
      const response = await getAttachment(attachmentName);
      const blob = await response.blob();
      if (!blob || blob.size === 0) {
        toast.error('Attachment is empty or could not be loaded.');
        return;
      }
      const url = window.URL.createObjectURL(blob);
      // Determine file type
      let type = 'unsupported';
      const extension = attachmentName.split('.').pop().toLowerCase();
      if (["jpg","jpeg","png","gif","bmp"].includes(extension)) {
        type = 'image';
      } else if (extension === 'pdf') {
        type = 'pdf';
      }
      setPreviewedCommentIdx(idx);
      setPreviewedCommentUrl(url);
      setPreviewedCommentType(type);
    } catch {
      toast.error('Failed to fetch attachment');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() && !commentAttachment) return;
    try {
      setIsSubmittingComment(true);
      const updatedComments = await commentOnTicket(ticketId, newComment, commentAttachment);
      setTicket(prev => ({ ...prev, comments: updatedComments }));
      setNewComment('');
      setCommentAttachment(null);
      toast.success('Comment added successfully');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const openRevokeModal = () => {
    setRevokeComment('');
    setShowRevokeModal(true);
  };

  const handleRevokeSubmit = async (e) => {
    e.preventDefault();
    if (!revokeComment.trim()) {
      toast.error('Comment is required to revoke a ticket.');
      return;
    }
    try {
      setIsRevoking(true);
      await revokeTicket(ticketId, revokeComment.trim());
      setTicket(prev => ({ ...prev, status: 'revoked' }));
      setShowRevokeModal(false);
      toast.success('Ticket revoked successfully');
    } catch (error) {
      console.error('Error revoking ticket:', error);
      toast.error('Failed to revoke ticket');
    } finally {
      setIsRevoking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Ticket not found.</div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className={`p-6 max-w-full mx-auto bg-gray-50 min-h-screen ${showRevokeModal ? "blur-background" : ""}`}>
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/my-tickets"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Tickets
          </Link>
        </div>
        <div className="space-y-6">
          {/* Main Ticket Info */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-4">
                    <input
                      type="text"
                      name="title"
                      value={editForm.title}
                      onChange={handleInputChange}
                      className="w-full text-2xl font-bold text-gray-900 bg-transparent border-b-2 border-purple-300 focus:border-purple-500 focus:outline-none"
                      placeholder="Enter ticket title"
                    />
                    <p className="text-gray-600">Ticket ID: {ticket.ticket_id}</p>
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{ticket.title}</h1>
                    <p className="text-gray-600">Ticket ID: {ticket.ticket_id}</p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(ticket.status).bg} ${getStatusColor(ticket.status).text} ${getStatusColor(ticket.status).border}`}>
                  {getStatusIcon(ticket.status)}
                  {ticket.status === 'in_progress' ? 'In Progress' : ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                </span>
              </div>
            </div>
            {/* Description */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
              {isEditing ? (
                <textarea
                  name="description"
                  value={editForm.description}
                  onChange={handleInputChange}
                  rows={6}
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-none"
                  placeholder="Enter ticket description"
                />
              ) : (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
                </div>
              )}
            </div>
            {/* Ticket Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">From Department</h3>
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-gray-400" />
                    <span className="text-gray-900">
                      {typeof ticket.from_department === 'object' 
                        ? ticket.from_department?.name || 'Unknown Department'
                        : ticket.from_department || 'Unknown Department'
                      }
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">To Department</h3>
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-gray-400" />
                    <span className="text-gray-900">{ticket.to_department?.name || ticket.to_department}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Assigned to</h3>
                  {ticket.assigned_to ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-gray-900 font-medium">{ticket.assigned_to.name || ticket.assigned_to.email || ticket.assigned_to}</span>
                      {ticket.assigned_to.email && (
                        <span className="text-xs text-gray-500">{ticket.assigned_to.email}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-500">Unassigned</span>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Created</h3>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    <span className="text-gray-900">
                      {new Date(ticket.createdAt).toLocaleDateString()} at {new Date(ticket.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Last Updated</h3>
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-gray-400" />
                    <span className="text-gray-900">
                      {new Date(ticket.updatedAt || ticket.createdAt).toLocaleDateString()} at {new Date(ticket.updatedAt || ticket.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {/* Edit/Save/Cancel Buttons */}
            {ticket.status === 'pending' && (
              <div className="flex justify-end mt-4 gap-3">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="inline-flex items-center px-4 py-2 bg-gray-500 text-white rounded-xl hover:bg-gray-600 font-semibold shadow-lg transition-all duration-200"
                    >
                      <X size={18} className="mr-2" />
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                      className="inline-flex items-center px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                    >
                      <Save size={18} className="mr-2" />
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleEditTicket}
                    className="inline-flex items-center px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    <Edit3 size={18} className="mr-2" />
                    Edit Ticket
                  </button>
                )}
              </div>
            )}
            {/* Revoke Button - Show for all tickets except already revoked ones */}
            {ticket.status !== 'revoked' && (
              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={openRevokeModal}
                  disabled={isRevoking}
                  className="inline-flex items-center px-6 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  <Trash2 size={18} className="mr-2" />
                  {isRevoking ? 'Revoking...' : 'Revoke Ticket'}
                </button>
              </div>
            )}
          </div>
          {/* Attachments */}
          {ticket.attachment && (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText size={20} className="text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{formatAttachmentName(ticket.attachment)}</p>
                      <p className="text-sm text-gray-500">Click to preview or download</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePreviewAttachment}
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Eye size={16} />
                      Preview
                    </button>
                    <button
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                      type="button"
                      tabIndex={-1}
                      disabled
                    >
                      <Download size={16} />
                      Download
                    </button>
                  </div>
                </div>
                {/* Preview area only visible after clicking Preview */}
                {showAttachment && (
                  <div className="mt-4 p-4 border border-gray-200 rounded-lg">
                    <div className="text-center">
                      {attachmentType === 'image' && (
                        <img
                          src={attachmentUrl}
                          alt="Attachment"
                          className="max-w-full h-auto rounded-lg border border-gray-200 mx-auto"
                          style={{ maxHeight: '400px' }}
                        />
                      )}
                      {attachmentType === 'pdf' && (
                        <iframe
                          src={attachmentUrl}
                          title="Attachment PDF"
                          className="w-full h-96 border border-gray-200 rounded-lg"
                        />
                      )}
                      {attachmentType === 'unsupported' && (
                        <div className="text-center">
                          <p className="text-sm text-red-600 mb-2">
                            This file type is not supported for preview.
                          </p>
                          <div className="w-32 h-32 bg-gray-100 rounded-lg mx-auto flex items-center justify-center">
                            <FileText size={32} className="text-gray-400" />
                          </div>
                          <p className="text-sm text-gray-500 mt-2">
                            Please download the file to view it.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Comments Section */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Comments</h3>
            {ticket.comments && ticket.comments.length > 0 ? (
              <div className="space-y-4">
                {ticket.comments.map((comment, idx) => (
                  <div key={comment._id || idx} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-800">{comment.by === 'departmental-admin' ? 'Department Admin' : 'Employee'}</span>
                      <span className="text-xs text-gray-500">{new Date(comment.at).toLocaleString()}</span>
                    </div>
                    <p className="text-gray-700">{comment.text}</p>
                    {comment.attachment && (
                      <div className="mt-2 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-gray-400" />
                          <span className="text-xs text-gray-700">{formatAttachmentName(comment.attachment)}</span>
                          <button
                            type="button"
                            onClick={() => handleCommentAttachmentPreview(comment.attachment, idx)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye size={14} /> Preview
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const response = await getAttachment(comment.attachment);
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = comment.attachment;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                window.URL.revokeObjectURL(url);
                              } catch {
                                toast.error('Failed to download attachment');
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <Download size={14} /> Download
                          </button>
                        </div>
                        {previewedCommentIdx === idx && previewedCommentUrl && (
                          <div className="mt-2 p-2 border border-gray-200 rounded-lg">
                            {previewedCommentType === 'image' && (
                              <div className="text-center">
                                <img
                                  src={previewedCommentUrl}
                                  alt="Attachment"
                                  className="max-w-full h-auto rounded-lg border border-gray-200 mx-auto"
                                  style={{ maxHeight: '300px' }}
                                />
                              </div>
                            )}
                            {previewedCommentType === 'pdf' && (
                              <div className="text-center">
                                <iframe
                                  src={previewedCommentUrl}
                                  title="Attachment PDF"
                                  className="w-full h-64 border border-gray-200 rounded-lg"
                                />
                              </div>
                            )}
                            {previewedCommentType === 'unsupported' && (
                              <div className="text-center">
                                <p className="text-sm text-red-600 mb-2">
                                  This file type is not supported for preview.
                                </p>
                                <div className="w-24 h-24 bg-gray-100 rounded-lg mx-auto flex items-center justify-center">
                                  <FileText size={24} className="text-gray-400" />
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                  Please download the file to view it.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No comments yet.</p>
            )}
            {/* Add Comment Form (non-functional) */}
            <form onSubmit={handleAddComment} className="flex items-center gap-2 mt-6">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                disabled={isSubmittingComment}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-gray-100"
              />
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={event => setCommentAttachment(event.target.files[0] || null)}
                className="block text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-gray-100 file:text-gray-700 mt-2"
              />
              <button
                type="submit"
                disabled={isSubmittingComment}
                className="px-4 py-2 rounded-lg bg-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                Add Comment
              </button>
            </form>
          </div>
        </div>
      </div>
      {showRevokeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-red-700">Revoke Ticket</h2>
            <form onSubmit={handleRevokeSubmit}>
              <label className="block mb-2 font-medium">Comment <span className="text-red-500">*</span></label>
              <textarea
                className="w-full border border-gray-300 rounded-lg p-2 mb-4"
                rows={4}
                value={revokeComment}
                onChange={e => setRevokeComment(e.target.value)}
                placeholder="Please provide a reason for revoking this ticket"
                required
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-200 rounded-lg font-semibold"
                  onClick={() => setShowRevokeModal(false)}
                  disabled={isRevoking}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold"
                  disabled={isRevoking}
                >
                  {isRevoking ? 'Revoking...' : 'Revoke Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketDetail;
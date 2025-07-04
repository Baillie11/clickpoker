import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './UserProfile.css';

interface ProfileData {
  fullName?: string;
  bio?: string;
  city?: string;
  state?: string;
  country?: string;
  timezone?: string;
  favoritePokerVariant?: string;
  experienceLevel?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Professional';
  preferredTableStakes?: string;
  privacyLevel?: 'Public' | 'Friends' | 'Private';
  avatarUrl?: string;
}

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ isOpen, onClose }) => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        fullName: user.fullName || '',
        bio: user.bio || '',
        city: user.city || '',
        state: user.state || '',
        country: user.country || '',
        timezone: user.timezone || '',
        favoritePokerVariant: user.favoritePokerVariant || 'Texas Hold\'em',
        experienceLevel: user.experienceLevel || 'Beginner',
        preferredTableStakes: user.preferredTableStakes || 'Low',
        privacyLevel: user.privacyLevel || 'Public',
        avatarUrl: user.avatarUrl || ''
      });
    }
  }, [user]);

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });

      if (response.ok) {
        const data = await response.json();
        updateUser(data.user);
        setIsEditing(false);
      } else {
        console.error('Failed to update profile');
        alert('Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setProfileData({
        fullName: user.fullName || '',
        bio: user.bio || '',
        city: user.city || '',
        state: user.state || '',
        country: user.country || '',
        timezone: user.timezone || '',
        favoritePokerVariant: user.favoritePokerVariant || 'Texas Hold\'em',
        experienceLevel: user.experienceLevel || 'Beginner',
        preferredTableStakes: user.preferredTableStakes || 'Low',
        privacyLevel: user.privacyLevel || 'Public',
        avatarUrl: user.avatarUrl || ''
      });
    }
    setIsEditing(false);
  };

  const getAvatarUrl = () => {
    if (profileData.avatarUrl) {
      return profileData.avatarUrl;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || user?.username || 'U')}&background=0066cc&color=fff&size=200`;
  };

  if (!isOpen || !user) return null;

  return (
    <div className="profile-overlay">
      <div className="profile-modal">
        <div className="profile-header">
          <h2>User Profile</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="profile-content">
          <div className="profile-avatar-section">
            <div className="avatar-container">
              <img 
                src={getAvatarUrl()} 
                alt="Profile Avatar" 
                className="profile-avatar"
              />
              {isEditing && (
                <div className="avatar-url-input">
                  <label>Avatar URL:</label>
                  <input
                    type="url"
                    value={profileData.avatarUrl || ''}
                    onChange={(e) => handleInputChange('avatarUrl', e.target.value)}
                    placeholder="Enter image URL or leave blank for auto-generated"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="profile-info">
            <div className="profile-field">
              <label>Username:</label>
              <span className="readonly">{user.username}</span>
            </div>

            <div className="profile-field">
              <label>Email:</label>
              <span className="readonly">{user.email}</span>
            </div>

            <div className="profile-field">
              <label>Full Name:</label>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.fullName || ''}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                />
              ) : (
                <span>{user.fullName}</span>
              )}
            </div>

            <div className="profile-field">
              <label>Bio:</label>
              {isEditing ? (
                <textarea
                  value={profileData.bio || ''}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Tell others about yourself..."
                  rows={3}
                />
              ) : (
                <span>{user.bio || 'No bio provided'}</span>
              )}
            </div>

            <div className="profile-row">
              <div className="profile-field">
                <label>City:</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profileData.city || ''}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                  />
                ) : (
                  <span>{user.city || 'Not specified'}</span>
                )}
              </div>

              <div className="profile-field">
                <label>State:</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profileData.state || ''}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                  />
                ) : (
                  <span>{user.state || 'Not specified'}</span>
                )}
              </div>
            </div>

            <div className="profile-field">
              <label>Country:</label>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.country || ''}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                />
              ) : (
                <span>{user.country || 'Not specified'}</span>
              )}
            </div>

            <div className="profile-field">
              <label>Experience Level:</label>
              {isEditing ? (
                <select
                  value={profileData.experienceLevel || 'Beginner'}
                  onChange={(e) => handleInputChange('experienceLevel', e.target.value)}
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Professional">Professional</option>
                </select>
              ) : (
                <span>{user.experienceLevel || 'Beginner'}</span>
              )}
            </div>

            <div className="profile-field">
              <label>Favorite Poker Variant:</label>
              {isEditing ? (
                <select
                  value={profileData.favoritePokerVariant || 'Texas Hold\'em'}
                  onChange={(e) => handleInputChange('favoritePokerVariant', e.target.value)}
                >
                  <option value="Texas Hold'em">Texas Hold'em</option>
                  <option value="Omaha">Omaha</option>
                  <option value="Seven Card Stud">Seven Card Stud</option>
                  <option value="Five Card Draw">Five Card Draw</option>
                </select>
              ) : (
                <span>{user.favoritePokerVariant || 'Texas Hold\'em'}</span>
              )}
            </div>

            <div className="profile-field">
              <label>Preferred Stakes:</label>
              {isEditing ? (
                <select
                  value={profileData.preferredTableStakes || 'Low'}
                  onChange={(e) => handleInputChange('preferredTableStakes', e.target.value)}
                >
                  <option value="Micro">Micro Stakes</option>
                  <option value="Low">Low Stakes</option>
                  <option value="Medium">Medium Stakes</option>
                  <option value="High">High Stakes</option>
                </select>
              ) : (
                <span>{user.preferredTableStakes || 'Low'} Stakes</span>
              )}
            </div>

            <div className="profile-field">
              <label>Privacy Level:</label>
              {isEditing ? (
                <select
                  value={profileData.privacyLevel || 'Public'}
                  onChange={(e) => handleInputChange('privacyLevel', e.target.value)}
                >
                  <option value="Public">Public</option>
                  <option value="Friends">Friends Only</option>
                  <option value="Private">Private</option>
                </select>
              ) : (
                <span>{user.privacyLevel || 'Public'}</span>
              )}
            </div>

            <div className="profile-stats">
              <div className="stat">
                <label>Games Played:</label>
                <span>{user.totalGamesPlayed || 0}</span>
              </div>
              <div className="stat">
                <label>Total Winnings:</label>
                <span>{user.totalWinnings || 0} chips</span>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-actions">
          {isEditing ? (
            <>
              <button 
                className="save-btn" 
                onClick={handleSave} 
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
              <button 
                className="cancel-btn" 
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancel
              </button>
            </>
          ) : (
            <button className="edit-btn" onClick={() => setIsEditing(true)}>
              Edit Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;

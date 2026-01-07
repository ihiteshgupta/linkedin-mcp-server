/**
 * LinkedIn API Client
 * Supports profile access, posting content, and sharing articles.
 */

const LINKEDIN_API_URL = "https://api.linkedin.com";

export interface PostResult {
  success: boolean;
  id?: string;
  message?: string;
}

export interface Profile {
  sub?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email?: string;
  email_verified?: boolean;
}

export class LinkedInClient {
  private accessToken: string;
  private memberUrn: string | null = null;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private getHeaders(version: boolean = true): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    };
    if (version) {
      headers["LinkedIn-Version"] = "202401";
    }
    return headers;
  }

  /**
   * Get the member URN for the authenticated user
   */
  async getMemberUrn(): Promise<string> {
    if (this.memberUrn) {
      return this.memberUrn;
    }

    // Try REST /me endpoint first
    try {
      const response = await fetch(`${LINKEDIN_API_URL}/rest/me`, {
        headers: this.getHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.sub) {
          this.memberUrn = `urn:li:person:${data.sub}`;
          return this.memberUrn;
        }
      }
    } catch (error) {
      // Continue to fallback
    }

    // Try userinfo endpoint
    try {
      const response = await fetch(`${LINKEDIN_API_URL}/v2/userinfo`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.sub) {
          this.memberUrn = `urn:li:person:${data.sub}`;
          return this.memberUrn;
        }
      }
    } catch (error) {
      // Continue to fallback
    }

    // Try v2 /me endpoint
    try {
      const response = await fetch(`${LINKEDIN_API_URL}/v2/me`, {
        headers: this.getHeaders(false),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.id) {
          this.memberUrn = `urn:li:person:${data.id}`;
          return this.memberUrn;
        }
      }
    } catch (error) {
      // Continue
    }

    throw new Error(
      "Unable to determine member URN. Please ensure you have 'Sign In with LinkedIn using OpenID Connect' product enabled in your LinkedIn app."
    );
  }

  /**
   * Get user profile information
   */
  async getProfile(): Promise<Profile> {
    // Try userinfo endpoint (OpenID Connect)
    try {
      const response = await fetch(`${LINKEDIN_API_URL}/v2/userinfo`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      // Continue to fallback
    }

    // Try REST /me endpoint
    try {
      const response = await fetch(`${LINKEDIN_API_URL}/rest/me`, {
        headers: this.getHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          sub: data.sub || data.id,
          name: data.name || data.localizedFirstName,
        };
      }
    } catch (error) {
      // Continue to fallback
    }

    // Try v2 /me endpoint
    const response = await fetch(`${LINKEDIN_API_URL}/v2/me`, {
      headers: this.getHeaders(false),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        sub: data.id,
        given_name: data.localizedFirstName,
        family_name: data.localizedLastName,
        name: `${data.localizedFirstName || ""} ${data.localizedLastName || ""}`.trim(),
      };
    }

    throw new Error("Failed to fetch profile");
  }

  /**
   * Create a text post on LinkedIn
   */
  async createPost(
    text: string,
    visibility: "PUBLIC" | "CONNECTIONS" | "LOGGED_IN" = "PUBLIC"
  ): Promise<PostResult> {
    const memberUrn = await this.getMemberUrn();

    // Try REST Posts API first (newer API)
    const postData = {
      author: memberUrn,
      commentary: text,
      visibility: visibility,
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    };

    let response = await fetch(`${LINKEDIN_API_URL}/rest/posts`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(postData),
    });

    if (response.ok || response.status === 201) {
      const postId = response.headers.get("x-restli-id") || "created";
      return { success: true, id: postId };
    }

    // Fallback to legacy ugcPosts API
    const legacyPostData = {
      author: memberUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": visibility,
      },
    };

    response = await fetch(`${LINKEDIN_API_URL}/v2/ugcPosts`, {
      method: "POST",
      headers: this.getHeaders(false),
      body: JSON.stringify(legacyPostData),
    });

    if (response.ok || response.status === 201) {
      const data = await response.json();
      return { success: true, id: data.id };
    }

    const errorText = await response.text();
    throw new Error(`Failed to create post: ${response.status} - ${errorText}`);
  }

  /**
   * Create a post with an article/link
   */
  async createArticlePost(
    text: string,
    articleUrl: string,
    title?: string,
    description?: string,
    visibility: "PUBLIC" | "CONNECTIONS" | "LOGGED_IN" = "PUBLIC"
  ): Promise<PostResult> {
    const memberUrn = await this.getMemberUrn();

    // Try REST Posts API with article
    const postData: Record<string, unknown> = {
      author: memberUrn,
      commentary: text,
      visibility: visibility,
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      content: {
        article: {
          source: articleUrl,
          title: title,
          description: description,
        },
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    };

    let response = await fetch(`${LINKEDIN_API_URL}/rest/posts`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(postData),
    });

    if (response.ok || response.status === 201) {
      const postId = response.headers.get("x-restli-id") || "created";
      return { success: true, id: postId };
    }

    // Fallback to legacy ugcPosts API
    const mediaItem: Record<string, unknown> = {
      status: "READY",
      originalUrl: articleUrl,
    };

    if (title) {
      mediaItem.title = { text: title };
    }
    if (description) {
      mediaItem.description = { text: description };
    }

    const legacyPostData = {
      author: memberUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: "ARTICLE",
          media: [mediaItem],
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": visibility,
      },
    };

    response = await fetch(`${LINKEDIN_API_URL}/v2/ugcPosts`, {
      method: "POST",
      headers: this.getHeaders(false),
      body: JSON.stringify(legacyPostData),
    });

    if (response.ok || response.status === 201) {
      const data = await response.json();
      return { success: true, id: data.id };
    }

    const errorText = await response.text();
    throw new Error(`Failed to create article post: ${response.status} - ${errorText}`);
  }

  /**
   * Get user's recent posts (may require additional permissions)
   */
  async getPosts(count: number = 10): Promise<{ posts: unknown[]; message?: string }> {
    const memberUrn = await this.getMemberUrn();

    // Try to fetch posts using ugcPosts API
    const response = await fetch(
      `${LINKEDIN_API_URL}/v2/ugcPosts?q=authors&authors=List(${encodeURIComponent(memberUrn)})&count=${count}`,
      {
        headers: this.getHeaders(false),
      }
    );

    if (response.ok) {
      const data = await response.json();
      return { posts: data.elements || [] };
    }

    // This often requires additional permissions
    return {
      posts: [],
      message: "Unable to fetch posts. This may require additional LinkedIn API permissions.",
    };
  }

  /**
   * Delete a post (if supported)
   */
  async deletePost(postId: string): Promise<{ success: boolean; message?: string }> {
    // Try REST API
    let response = await fetch(`${LINKEDIN_API_URL}/rest/posts/${encodeURIComponent(postId)}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });

    if (response.ok || response.status === 204) {
      return { success: true };
    }

    // Try legacy API
    response = await fetch(`${LINKEDIN_API_URL}/v2/ugcPosts/${encodeURIComponent(postId)}`, {
      method: "DELETE",
      headers: this.getHeaders(false),
    });

    if (response.ok || response.status === 204) {
      return { success: true };
    }

    return {
      success: false,
      message: `Failed to delete post: ${response.status}`,
    };
  }

  /**
   * Get connection count (may require additional permissions)
   */
  async getConnectionsCount(): Promise<{ count: number | string; message?: string }> {
    const response = await fetch(
      `${LINKEDIN_API_URL}/v2/connections?q=viewer&start=0&count=0`,
      {
        headers: this.getHeaders(false),
      }
    );

    if (response.ok) {
      const data = await response.json();
      return { count: data.paging?.total || 0 };
    }

    return {
      count: "unavailable",
      message: "Connection count may require additional permissions.",
    };
  }
}

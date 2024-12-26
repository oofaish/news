"use client";
import { useCallback, useEffect, useState } from "react";
import { Database, Article } from "../database.types";
import {
  Session,
  createClientComponentClient,
  SupabaseClient,
} from "@supabase/auth-helpers-nextjs";
import { PostgrestFilterBuilder } from "@supabase/postgrest-js";
import ArticleRow from "./article-row";

const DEFAULT_ARTICLES_PER_PAGE = 100;

const SCORE_CUTOFF = -3;
const TOP_SCORE_DAYS = 5;
const NEWEST_DAYS = 10;

type FilterType =
  | "New News"
  | "Read and Unread News"
  | "Saved"
  | "Archived"
  | "Down"
  | "Up";
type SortType = "Top Score" | "Newest";

function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T) => {
      try {
        setStoredValue(value);
        if (typeof window !== "undefined") {
          localStorage.setItem(key, JSON.stringify(value));
        }
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key],
  );

  return [storedValue, setValue];
}

const getQuery = (
  supabase: SupabaseClient<Database>,
  sort: SortType,
  filter: FilterType,
  publicationFilter: string[],
): PostgrestFilterBuilder<
  Database["public"],
  Database["public"]["Tables"]["article"]["Row"],
  Database["public"]["Tables"]["article"]["Row"][],
  "article"
> => {
  let query = supabase.from("article").select(`*`);

  const cutOff = new Date();
  cutOff.setDate(
    cutOff.getDate() - (sort === "Top Score" ? TOP_SCORE_DAYS : NEWEST_DAYS),
  );

  // Build query based on filter type
  switch (filter) {
    case "New News":
      query = query.eq("archived", false).eq("read", false);
      break;
    case "Read and Unread News":
      query = query.eq("archived", false);
      break;
    case "Saved":
      query = query.eq("saved", true);
      break;
    case "Archived":
      query = query.eq("archived", true);
      break;
    case "Down":
      query = query.lt("score", 0);
      break;
    case "Up":
      query = query.gt("score", 0);
      break;
  }

  // Apply common filters for non-special cases
  if (!["Down", "Saved", "Up", "Archived"].includes(filter)) {
    query = query
      .gte("score", SCORE_CUTOFF)
      .gte("published_at", cutOff.toISOString());
  }

  // Apply publication filter
  if (publicationFilter.length > 0) {
    query = query.in("publication", publicationFilter);
  }

  // Apply sorting
  if (sort === "Top Score") {
    query = query
      .order("score", { ascending: false })
      .order("published_at", { ascending: false });
  } else {
    query = query.order("published_at", { ascending: false });
  }

  // @ts-ignore
  return query;
};

export default function ArticleList({ session }: { session: Session | null }) {
  const supabase = createClientComponentClient<Database>();

  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [allPublications, setAllPublications] = useState<string[]>([]);
  const [filter, setFilter] = useLocalStorage<FilterType>(
    "filter",
    "Read and Unread News",
  );
  const [sort, setSort] = useLocalStorage<SortType>("sort", "Top Score");
  const [selectedPublications, setSelectedPublications] = useLocalStorage<
    string[]
  >("selectedPublications", []);
  const [selectedTagsScope, setSelectedTagsScope] = useLocalStorage<string[]>(
    "selectedTagsScope",
    [],
  );
  const [selectedTagsMood, setSelectedTagsMood] = useLocalStorage<string[]>(
    "selectedTagsMood",
    [],
  );
  const [selectedTagsTopic, setSelectedTagsTopic] = useLocalStorage<string[]>(
    "selectedTagsTopic",
    [],
  );

  const filters = [
    "New News",
    "Read and Unread News",
    "Saved",
    "Archived",
    "Down",
    "Up",
  ];

  const sorts = ["Top Score", "Newest"];

  useEffect(() => {
    const fetchPublications = async () => {
      try {
        const { data, error } = await supabase
          .from("recent_publications")
          .select("publication");

        if (error) throw error;

        if (data) {
          const publications = data.map((item: any) => item["publication"]);
          setAllPublications(publications);

          // If no publications are selected, select all by default
          if (selectedPublications.length === 0) {
            setSelectedPublications(publications);
          }
        }
      } catch (error) {
        console.error("Error fetching publications:", error);
      }
    };

    fetchPublications();
  }, [supabase]);

  useEffect(() => {
    setArticles([]);
    setCurrentPage(0);
  }, [sort, filter, selectedPublications]);

  useEffect(() => {
    if (currentPage === 0) {
      loadMoreArticles();
    }
  }, [currentPage]);

  const loadMoreArticles = useCallback(async () => {
    try {
      setLoading(true);
      let query = getQuery(supabase, sort, filter, selectedPublications);

      query = query.range(
        currentPage * DEFAULT_ARTICLES_PER_PAGE,
        (currentPage + 1) * DEFAULT_ARTICLES_PER_PAGE - 1,
      );

      let { data, error, status } = await query;

      if (error && status !== 406) {
        throw error;
      }

      if (data) {
        // Create a map of existing article IDs to avoid duplicates
        const existingArticleIds = new Set(
          articles.map((article) => article.id),
        );

        // Filter out any articles that we already have
        const newArticles = data.filter(
          (article) => !existingArticleIds.has(article.id),
        );

        const newAndOldArticles = [...articles, ...newArticles];

        setArticles(
          newAndOldArticles.filter(
            (article) =>
              selectedPublications.length == 0 ||
              selectedPublications.includes(article.publication),
          ),
        );

        setCurrentPage(currentPage + 1);

        setAllArticles(newAndOldArticles);
      }
    } catch (error) {
      console.error("Error loading more articles:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase, articles, currentPage, filter, sort, selectedPublications]);

  // Generic handler for multiple select changes
  const handleMultiSelectChange = useCallback(
    (setter: (value: string[]) => void) =>
      (event: React.ChangeEvent<HTMLSelectElement>) => {
        try {
          const selected = Array.from(
            event.target.selectedOptions,
            (option) => option.value,
          );
          setter(selected);
        } catch (error) {
          console.error("Error handling multi-select change:", error);
        }
      },
    [],
  );

  // Handler for filter changes
  const handleFilterChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const newFilter = event.target.value as FilterType;
      if (!filters.includes(newFilter)) {
        console.error(`Invalid filter value: ${newFilter}`);
        return;
      }
      setArticles([]);
      setFilter(newFilter);
    },
    [filters],
  );

  // Handler for sort changes
  const handleSortChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const newSort = event.target.value as SortType;
      if (!sorts.includes(newSort)) {
        console.error(`Invalid sort value: ${newSort}`);
        return;
      }
      setArticles([]);
      setSort(newSort);
    },
    [sorts],
  );

  // Use the generic handler for all multi-select changes
  const handlePublicationChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      handleMultiSelectChange(setSelectedPublications)(event);
      setArticles([]); // Clear articles to trigger reload
    },
    [handleMultiSelectChange],
  );

  const handleTagsScopeChange = useCallback(
    handleMultiSelectChange(setSelectedTagsScope),
    [handleMultiSelectChange],
  );

  const handleTagsMoodChange = useCallback(
    handleMultiSelectChange(setSelectedTagsMood),
    [handleMultiSelectChange],
  );

  const handleTagsTopicChange = useCallback(
    handleMultiSelectChange(setSelectedTagsTopic),
    [handleMultiSelectChange],
  );

  const updateArticle = (updatedArticle: Article) => {
    setArticles((prevArticles) =>
      prevArticles
        .map((article) =>
          article.id === updatedArticle.id ? updatedArticle : article,
        )
        .filter((article) => {
          if (filter === "New News") {
            return !article.archived && !article.read;
          } else if (filter === "Read and Unread News") {
            // keep the updated article in unless it's been archive
            return (
              !article.archived ||
              (article.id == updatedArticle.id && !article.archived)
            );
          } else if (filter === "Saved") {
            return true;
          } else if (filter === "Archived") {
            return true;
          } else if (filter === "Down") {
            return article.score < 10;
          } else if (filter === "Up") {
            return article.score > -10;
          } else {
            return true;
          }
        }),
    );
  };

  // Optimize tag filtering effect
  useEffect(() => {
    const filterArticlesByTags = () => {
      if (
        selectedTagsScope.length === 0 &&
        selectedTagsMood.length === 0 &&
        selectedTagsTopic.length === 0
      ) {
        return allArticles; // No filtering needed
      }

      return allArticles.filter((article) => {
        const matchesScope =
          selectedTagsScope.length === 0 ||
          selectedTagsScope.some((tag) => article.tags_scope?.includes(tag));
        const matchesMood =
          selectedTagsMood.length === 0 ||
          selectedTagsMood.some((tag) => article.tags_mood?.includes(tag));
        const matchesTopic =
          selectedTagsTopic.length === 0 ||
          selectedTagsTopic.some((tag) => article.tags_topic?.includes(tag));
        return matchesScope && matchesMood && matchesTopic;
      });
    };

    setArticles(filterArticlesByTags());
  }, [selectedTagsScope, selectedTagsMood, selectedTagsTopic, allArticles]);

  const refreshPage = () => {
    setArticles([]);
    setCurrentPage(0);
    loadMoreArticles();
  };

  const uniqueTagsScope = Array.from(
    new Set(allArticles.flatMap((article) => article.tags_scope || [])),
  );
  const uniqueTagsMood = Array.from(
    new Set(allArticles.flatMap((article) => article.tags_mood || [])),
  );
  const uniqueTagsTopic = Array.from(
    new Set(allArticles.flatMap((article) => article.tags_topic || [])),
  );

  return (
    <div>
      <div className="flex-container">
        <select onChange={handleFilterChange} value={filter}>
          {filters.map((filter) => (
            <option key={filter} value={filter}>
              {filter}
            </option>
          ))}
        </select>
        <select onChange={handleSortChange} value={sort}>
          {sorts.map((sort) => (
            <option key={sort} value={sort}>
              {sort}
            </option>
          ))}
        </select>

        <select
          multiple={true}
          value={selectedPublications}
          onChange={handlePublicationChange}
        >
          {allPublications.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <button className="refresh button" onClick={refreshPage}>
          Refresh
        </button>
      </div>
      <div className="filters">
        <select
          multiple
          value={selectedTagsScope}
          onChange={handleTagsScopeChange}
        >
          {uniqueTagsScope.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
        <select
          multiple
          value={selectedTagsMood}
          onChange={handleTagsMoodChange}
        >
          {uniqueTagsMood.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
        <select
          multiple
          value={selectedTagsTopic}
          onChange={handleTagsTopicChange}
        >
          {uniqueTagsTopic.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      </div>
      <div className="articles-list">
        {articles.map((article) => (
          <ArticleRow
            key={article.id}
            article={article}
            onUpdate={updateArticle}
          />
        ))}
      </div>
      <div>
        <button onClick={loadMoreArticles} disabled={loading}>
          {loading ? "Loading..." : "Load More"}
        </button>
        <form action="/auth/signout" method="post">
          <button className="signout button" type="submit">
            Sign out
          </button>
        </form>
      </div>
      {/* <div className="load-more-trigger"></div> */}
    </div>
  );
}

function fetchImg(imgName: string): Uint8Array {
	// abstract function for downloading images...
	return new Uint8Array();
}

type FetchImg = typeof fetchImg;

function weakRefCache(fetchImg: FetchImg) {
	// (1)
	const imgCache = new Map<string, WeakRef<Uint8Array>>(); // (2)

	return (imgName: string) => {
		// (3)
		const cachedImg = imgCache.get(imgName); // (4)

		if (cachedImg?.deref()) {
			// (5)
			return cachedImg?.deref();
		}

		const newImg = fetchImg(imgName); // (6)
		imgCache.set(imgName, new WeakRef(newImg)); // (7)

		return newImg;
	};
}

const getCachedImg = weakRefCache(fetchImg);

// 这种技术有助于避免为不再使用的资源密集型对象分配大量内存。在重用缓存对象的情况下，它还能节省内存和时间。
// 但是，这种实现方式也有其弊端：随着时间的推移，Map 中会填满作为键的字符串，这些字符串指向一个弱引用，而其引用对象早已被垃圾回收。
// 解决此问题的一种方法是定期清理缓存并移除“失效”的条目。另一种方法是使用FinalizationRegistry
